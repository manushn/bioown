import { getDb } from '../database/db.js';

/**
 * Convert time string HH:MM:SS or HH:MM to total minutes from midnight
 */
export function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  const seconds = parts[2] || 0;
  return hours * 60 + minutes + (seconds >= 30 ? 1 : 0);
}

/**
 * Convert total minutes to HH:MM:SS
 */
export function minutesToTime(totalMinutes) {
  const normalized = Math.max(0, Math.floor(totalMinutes));
  const hours = Math.floor(normalized / 60) % 24;
  const mins = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;
}

/**
 * Format minutes to human readable string (e.g. "7h 15m")
 */
export function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/**
 * Get active attendance rule
 */
export function getActiveRule(db = getDb()) {
  const rule = db.prepare('SELECT * FROM attendance_rules WHERE active = 1 ORDER BY id DESC LIMIT 1').get();
  if (rule) return rule;

  // Fallback default rule
  return {
    id: 1,
    rule_name: 'Default Schedule',
    checkin_target: '09:25:00',
    checkin_start: '08:00:00',
    checkin_end: '11:00:00',
    half_checkout_start: '12:00:00',
    half_checkout_end: '14:30:00',
    half_checkin_start: '14:31:00',
    half_checkin_end: '16:00:00',
    checkout_target: '17:30:00',
    checkout_start: '16:01:00',
    checkout_end: '20:00:00',
    full_day_required_minutes: 420,
    half_day_required_minutes: 210,
    late_compensation_enabled: 1,
    allow_admin_override: 1
  };
}

/**
 * Classify a list of raw punches for a single staff member on a specific date
 */
export function processStaffAttendanceForDate(staffMember, dateStr, rule = null, db = getDb()) {
  const activeRule = rule || getActiveRule(db);
  const staffId = staffMember.staff_id;

  // Query raw punches for staff on this date, ordered chronologically
  const punches = db.prepare(`
    SELECT * FROM punches 
    WHERE staff_id = ? AND punch_date = ? 
    ORDER BY punch_time ASC
  `).all(staffId, dateStr);

  // Check for admin override
  const override = db.prepare(`
    SELECT * FROM attendance_overrides 
    WHERE staff_id = ? AND attendance_date = ?
  `).get(staffId, dateStr);

  // If no punches recorded
  if (!punches || punches.length === 0) {
    const status = override ? override.override_status : 'ABSENT';
    return {
      staff_id: staffId,
      name: staffMember.name,
      department: staffMember.department,
      designation: staffMember.designation,
      attendance_date: dateStr,
      punches: [],
      in_time: null,
      out_time: null,
      half_out_time: null,
      half_in_time: null,
      in_status: null,
      out_status: null,
      late_minutes: 0,
      early_out_minutes: 0,
      expected_out_time: null,
      working_minutes: 0,
      working_duration: '0m',
      status: status,
      is_override: !!override,
      override_reason: override ? override.reason : null,
      override_admin: override ? override.admin_id : null
    };
  }

  // Filter out rapid accidental duplicate scans (< 60 seconds apart)
  const validPunches = [];
  for (let i = 0; i < punches.length; i++) {
    const current = punches[i];
    if (validPunches.length === 0) {
      validPunches.push(current);
    } else {
      const prev = validPunches[validPunches.length - 1];
      const diffSec = timeToMinutes(current.punch_time) * 60 - timeToMinutes(prev.punch_time) * 60;
      if (diffSec >= 60) {
        validPunches.push(current);
      }
    }
  }

  const targetCheckinMin = timeToMinutes(activeRule.checkin_target);
  const targetCheckoutMin = timeToMinutes(activeRule.checkout_target);

  // Punch 1 is Check-in
  const firstPunch = validPunches[0];
  const inTimeStr = firstPunch.punch_time;
  const inTimeMin = timeToMinutes(inTimeStr);

  let lateMinutes = 0;
  let inStatus = 'ON_TIME';

  if (inTimeMin > targetCheckinMin) {
    lateMinutes = inTimeMin - targetCheckinMin;
    inStatus = 'LATE';
  }

  // Late compensation logic:
  // If late by X minutes, expected checkout moves later by X minutes
  let expectedOutMin = targetCheckoutMin;
  if (activeRule.late_compensation_enabled && lateMinutes > 0) {
    expectedOutMin = targetCheckoutMin + lateMinutes;
  }
  const expectedOutTimeStr = minutesToTime(expectedOutMin);

  let halfOutTimeStr = null;
  let halfInTimeStr = null;
  let outTimeStr = null;
  let outStatus = null;
  let earlyOutMinutes = 0;
  let workingMinutes = 0;

  if (validPunches.length === 1) {
    // Only checked in
    outStatus = 'PENDING';
  } else if (validPunches.length === 2) {
    // Check-in and Check-out
    const lastPunch = validPunches[1];
    outTimeStr = lastPunch.punch_time;
    const outTimeMin = timeToMinutes(outTimeStr);

    if (outTimeMin < expectedOutMin) {
      earlyOutMinutes = expectedOutMin - outTimeMin;
      outStatus = 'EARLY_OUT';
    } else {
      outStatus = 'ON_TIME';
    }

    workingMinutes = Math.max(0, outTimeMin - inTimeMin);
  } else if (validPunches.length === 3) {
    // In, Midday out, Midday return (or In, Midday out, Evening out)
    const p2 = validPunches[1];
    const p3 = validPunches[2];
    const p2Min = timeToMinutes(p2.punch_time);
    const p3Min = timeToMinutes(p3.punch_time);

    const halfOutEnd = timeToMinutes(activeRule.half_checkout_end);
    if (p2Min <= halfOutEnd) {
      halfOutTimeStr = p2.punch_time;
      halfInTimeStr = p3.punch_time;
      outStatus = 'PENDING';
      workingMinutes = Math.max(0, p2Min - inTimeMin);
    } else {
      outTimeStr = p3.punch_time;
      if (p3Min < expectedOutMin) {
        earlyOutMinutes = expectedOutMin - p3Min;
        outStatus = 'EARLY_OUT';
      } else {
        outStatus = 'ON_TIME';
      }
      workingMinutes = Math.max(0, p3Min - inTimeMin);
    }
  } else {
    // 4 or more punches: Full cycle (In -> Half-out -> Half-in -> Out)
    const p1 = validPunches[0];
    const p2 = validPunches[1];
    const p3 = validPunches[2];
    const pLast = validPunches[validPunches.length - 1];

    halfOutTimeStr = p2.punch_time;
    halfInTimeStr = p3.punch_time;
    outTimeStr = pLast.punch_time;

    const pLastMin = timeToMinutes(outTimeStr);
    if (pLastMin < expectedOutMin) {
      earlyOutMinutes = expectedOutMin - pLastMin;
      outStatus = 'EARLY_OUT';
    } else {
      outStatus = 'ON_TIME';
    }

    const session1 = Math.max(0, timeToMinutes(halfOutTimeStr) - inTimeMin);
    const session2 = Math.max(0, pLastMin - timeToMinutes(halfInTimeStr));
    workingMinutes = session1 + session2;
  }

  // Calculate status based on working duration & rules
  let calculatedStatus = 'PRESENT';
  if (validPunches.length === 1) {
    calculatedStatus = 'CHECKED_IN';
  } else if (workingMinutes >= activeRule.full_day_required_minutes) {
    calculatedStatus = 'FULL DAY';
  } else if (workingMinutes >= activeRule.half_day_required_minutes) {
    calculatedStatus = 'HALF DAY';
  } else {
    calculatedStatus = 'HALF DAY';
  }

  // Final status consideration: Admin override takes precedence if set
  const finalStatus = override ? override.override_status : calculatedStatus;

  return {
    staff_id: staffId,
    name: staffMember.name,
    department: staffMember.department,
    designation: staffMember.designation,
    attendance_date: dateStr,
    punches: validPunches.map(p => ({
      id: p.id,
      time: p.punch_time,
      type: p.capture_type,
      terminal: p.terminal_id
    })),
    in_time: inTimeStr,
    out_time: outTimeStr,
    half_out_time: halfOutTimeStr,
    half_in_time: halfInTimeStr,
    in_status: inStatus,
    out_status: outStatus,
    late_minutes: lateMinutes,
    early_out_minutes: earlyOutMinutes,
    expected_out_time: expectedOutTimeStr,
    working_minutes: workingMinutes,
    working_duration: formatDuration(workingMinutes),
    status: finalStatus,
    is_override: !!override,
    override_reason: override ? override.reason : null,
    override_admin: override ? override.admin_id : null
  };
}

/**
 * Generate attendance report for a date or date range with comprehensive filters
 */
export function generateAttendanceReport({
  fromDate,
  toDate,
  department = 'All',
  staffId = 'All',
  statusFilter = 'All'
}, db = getDb()) {
  const activeRule = getActiveRule(db);

  // Determine date list
  const dates = [];
  const start = new Date(fromDate);
  const end = new Date(toDate || fromDate);
  const current = new Date(start);

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  // Query matching staff
  let staffQuery = 'SELECT * FROM staff WHERE active = 1';
  const staffParams = [];

  if (department && department !== 'All') {
    staffQuery += ' AND department = ?';
    staffParams.push(department);
  }
  if (staffId && staffId !== 'All') {
    staffQuery += ' AND staff_id = ?';
    staffParams.push(staffId);
  }
  staffQuery += ' ORDER BY department ASC, name ASC';

  const staffList = db.prepare(staffQuery).all(...staffParams);

  const reportRecords = [];
  const summary = {
    totalRecords: 0,
    totalStaff: staffList.length,
    present: 0,
    fullDay: 0,
    halfDay: 0,
    absent: 0,
    late: 0,
    earlyOut: 0
  };

  for (const dateStr of dates) {
    for (const staffMember of staffList) {
      const record = processStaffAttendanceForDate(staffMember, dateStr, activeRule, db);

      // Filter by status if specified
      if (statusFilter && statusFilter !== 'All') {
        const matchesStatus = 
          (statusFilter === 'PRESENT' && (record.status === 'FULL DAY' || record.status === 'PRESENT' || record.status === 'CHECKED_IN')) ||
          (statusFilter === 'FULL DAY' && (record.status === 'FULL DAY' || record.status === 'PRESENT')) ||
          (statusFilter === 'HALF DAY' && record.status === 'HALF DAY') ||
          (statusFilter === 'ABSENT' && record.status === 'ABSENT') ||
          (statusFilter === 'LATE' && record.late_minutes > 0) ||
          (statusFilter === 'EARLY_OUT' && record.early_out_minutes > 0);

        if (!matchesStatus) continue;
      }

      reportRecords.push(record);
      summary.totalRecords++;

      if (record.status === 'FULL DAY' || record.status === 'PRESENT' || record.status === 'CHECKED_IN') {
        summary.present++;
        if (record.status === 'FULL DAY' || record.status === 'PRESENT') summary.fullDay++;
      } else if (record.status === 'HALF DAY') {
        summary.present++;
        summary.halfDay++;
      } else if (record.status === 'ABSENT') {
        summary.absent++;
      }

      if (record.late_minutes > 0) summary.late++;
      if (record.early_out_minutes > 0) summary.earlyOut++;
    }
  }

  return {
    rule: activeRule,
    summary,
    records: reportRecords
  };
}

