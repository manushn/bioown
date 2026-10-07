import { getDb } from '../database/db.js';
import * as deviceService from '../services/deviceService.js';
import { 
  getActiveRule, 
  processStaffAttendanceForDate, 
  generateAttendanceReport,
  timeToMinutes,
  minutesToTime
} from '../attendance/engine.js';

/**
 * Handle a punch from fingerprint scanner or kiosk simulator
 */
export async function punch(req, res) {
  try {
    let { staff_id, template_data, terminal_id, capture_type } = req.body;
    const db = getDb();

    // 1. If template_data is provided instead of staff_id, identify the fingerprint
    if (!staff_id && template_data) {
      const matchResult = await deviceService.identifyFingerprint(template_data, db);
      if (!matchResult.match) {
        return res.status(404).json({
          success: false,
          error: 'Fingerprint not recognized. Please contact administrator to enroll.'
        });
      }
      staff_id = matchResult.staff_id;
    }

    if (!staff_id) {
      return res.status(400).json({ error: 'staff_id or template_data is required' });
    }

    // 2. Verify staff exists and is active
    const staff = db.prepare('SELECT * FROM staff WHERE staff_id = ? AND active = 1').get(staff_id);
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: `Staff ID '${staff_id}' not found or deactivated.`
      });
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    // 3. Query existing punches for today
    const existingPunches = db.prepare(`
      SELECT * FROM punches 
      WHERE staff_id = ? AND punch_date = ? 
      ORDER BY punch_time ASC
    `).all(staff_id, todayStr);

    // 4. Debounce accidental double-punches within 60 seconds
    if (existingPunches.length > 0) {
      const lastPunch = existingPunches[existingPunches.length - 1];
      const nowMin = timeToMinutes(timeStr);
      const lastMin = timeToMinutes(lastPunch.punch_time);
      if (Math.abs(nowMin * 60 - lastMin * 60) < 60) {
        return res.json({
          success: true,
          action: 'DUPLICATE_IGNORED',
          staff_id: staff.staff_id,
          name: staff.name,
          department: staff.department,
          message: 'Punch already recorded just now. Please wait before scanning again.',
          timestamp: timeStr,
          date: todayStr
        });
      }
    }

    const rule = getActiveRule(db);
    const targetCheckinMin = timeToMinutes(rule.checkin_target);
    const targetCheckoutMin = timeToMinutes(rule.checkout_target);
    const punchMin = timeToMinutes(timeStr);

    let punchAction = 'CHECK_IN';
    let greeting = `Welcome, ${staff.name}`;
    let submessage = 'Check-in recorded';
    let lateMinutes = 0;
    let earlyOutMinutes = 0;
    let expectedOutTime = rule.checkout_target;

    if (existingPunches.length === 0) {
      // First punch of the day: Check-in
      punchAction = 'CHECK_IN';
      greeting = `Welcome, ${staff.name}`;
      if (punchMin > targetCheckinMin) {
        lateMinutes = punchMin - targetCheckinMin;
        submessage = `Late by ${lateMinutes} min${lateMinutes > 1 ? 's' : ''}`;
      } else {
        submessage = 'On Time';
      }

      if (rule.late_compensation_enabled && lateMinutes > 0) {
        expectedOutTime = minutesToTime(targetCheckoutMin + lateMinutes);
      }
    } else if (existingPunches.length === 1) {
      // Second punch: Check-out (or midday leave)
      punchAction = 'CHECK_OUT';
      greeting = `Thank you, ${staff.name}`;
      
      // Calculate first punch late minutes to determine expected checkout
      const firstPunchMin = timeToMinutes(existingPunches[0].punch_time);
      if (firstPunchMin > targetCheckinMin) {
        lateMinutes = firstPunchMin - targetCheckinMin;
      }
      const expectedOutMin = rule.late_compensation_enabled ? targetCheckoutMin + lateMinutes : targetCheckoutMin;
      expectedOutTime = minutesToTime(expectedOutMin);

      if (punchMin < expectedOutMin) {
        earlyOutMinutes = expectedOutMin - punchMin;
        submessage = `Early checkout by ${earlyOutMinutes} min${earlyOutMinutes > 1 ? 's' : ''}`;
      } else {
        submessage = 'On Time';
      }
    } else if (existingPunches.length >= 2) {
      // Subsequent punch: either midday return or evening checkout
      punchAction = 'CHECK_OUT';
      greeting = `Thank you, ${staff.name}`;
      submessage = 'Checkout updated';
    }

    // 5. Store raw punch in database
    const insertRes = db.prepare(`
      INSERT INTO punches (staff_id, punch_date, punch_time, terminal_id, capture_type, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(
      staff.staff_id,
      todayStr,
      timeStr,
      terminal_id || 'TERM-01',
      capture_type || 'FINGERPRINT'
    );

    // 6. Recalculate full day record
    const updatedRecord = processStaffAttendanceForDate(staff, todayStr, rule, db);

    return res.json({
      success: true,
      punch_id: insertRes.lastInsertRowid,
      action: punchAction,
      greeting,
      submessage,
      staff_id: staff.staff_id,
      name: staff.name,
      department: staff.department,
      designation: staff.designation,
      punch_time: timeStr,
      punch_date: todayStr,
      late_minutes: lateMinutes,
      early_out_minutes: earlyOutMinutes,
      expected_out_time: expectedOutTime,
      attendance_summary: updatedRecord
    });
  } catch (err) {
    console.error('Punch recording error:', err);
    return res.status(500).json({ error: 'Internal server error recording punch' });
  }
}

/**
 * Get today's attendance summary for all active staff
 */
export function getToday(req, res) {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const report = generateAttendanceReport({
      fromDate: todayStr,
      toDate: todayStr,
      department: req.query.department || 'All',
      staffId: req.query.staffId || 'All',
      statusFilter: req.query.status || 'All'
    });
    return res.json(report);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Query attendance records across date range
 */
export function getAttendance(req, res) {
  try {
    const fromDate = req.query.fromDate || new Date().toISOString().split('T')[0];
    const toDate = req.query.toDate || fromDate;
    const department = req.query.department || 'All';
    const staffId = req.query.staffId || 'All';
    const statusFilter = req.query.status || 'All';

    const report = generateAttendanceReport({
      fromDate,
      toDate,
      department,
      staffId,
      statusFilter
    });
    return res.json(report);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Get single staff member's attendance history
 */
export function getStaffAttendance(req, res) {
  try {
    const staffId = req.params.staffId;
    const fromDate = req.query.fromDate || '2026-01-01';
    const toDate = req.query.toDate || new Date().toISOString().split('T')[0];

    const report = generateAttendanceReport({
      fromDate,
      toDate,
      staffId
    });
    return res.json(report);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Query raw punches
 */
export function getPunches(req, res) {
  try {
    const db = getDb();
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const staffId = req.query.staffId;

    let query = `
      SELECT p.*, s.name, s.department, s.designation 
      FROM punches p
      JOIN staff s ON p.staff_id = s.staff_id
      WHERE p.punch_date = ?
    `;
    const params = [date];

    if (staffId) {
      query += ' AND p.staff_id = ?';
      params.push(staffId);
    }
    query += ' ORDER BY p.punch_time DESC LIMIT 100';

    const rows = db.prepare(query).all(...params);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Set an admin attendance override
 */
export function setOverride(req, res) {
  try {
    const { staff_id, attendance_date, override_status, reason } = req.body;
    if (!staff_id || !attendance_date || !override_status || !reason) {
      return res.status(400).json({ error: 'staff_id, attendance_date, override_status, and reason are required' });
    }

    const db = getDb();
    const staff = db.prepare('SELECT * FROM staff WHERE staff_id = ?').get(staff_id);
    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    // Get current calculated status
    const currentRecord = processStaffAttendanceForDate(staff, attendance_date);

    db.prepare(`
      INSERT INTO attendance_overrides (staff_id, attendance_date, original_status, override_status, reason, admin_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(staff_id, attendance_date) DO UPDATE SET
        override_status = excluded.override_status,
        reason = excluded.reason,
        admin_id = excluded.admin_id,
        created_at = datetime('now')
    `).run(staff_id, attendance_date, currentRecord.status, override_status, reason, req.admin ? req.admin.username : 'admin');

    db.prepare(`
      INSERT INTO audit_logs (event_type, description, metadata, admin_username, created_at)
      VALUES ('ATTENDANCE_OVERRIDE', ?, ?, ?, datetime('now'))
    `).run(
      `Attendance override for ${staff_id} on ${attendance_date} to ${override_status}`,
      JSON.stringify({ staff_id, attendance_date, original: currentRecord.status, override: override_status, reason }),
      req.admin ? req.admin.username : 'admin'
    );

    return res.json({ success: true, message: 'Attendance override saved successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Get all active overrides
 */
export function getOverrides(req, res) {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT o.*, s.name, s.department 
      FROM attendance_overrides o
      JOIN staff s ON o.staff_id = s.staff_id
      ORDER BY o.attendance_date DESC LIMIT 100
    `).all();
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

