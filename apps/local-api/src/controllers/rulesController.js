import { getDb } from '../database/db.js';
import { getActiveRule } from '../attendance/engine.js';

export function getRules(req, res) {
  try {
    const db = getDb();
    const rule = getActiveRule(db);
    return res.json(rule);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export function updateRules(req, res) {
  try {
    const db = getDb();
    const current = getActiveRule(db);

    const {
      rule_name,
      checkin_target,
      checkin_start,
      checkin_end,
      half_checkout_start,
      half_checkout_end,
      half_checkin_start,
      half_checkin_end,
      checkout_target,
      checkout_start,
      checkout_end,
      full_day_required_minutes,
      half_day_required_minutes,
      late_compensation_enabled,
      allow_admin_override
    } = req.body;

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE attendance_rules SET
        rule_name = COALESCE(?, rule_name),
        checkin_target = COALESCE(?, checkin_target),
        checkin_start = COALESCE(?, checkin_start),
        checkin_end = COALESCE(?, checkin_end),
        half_checkout_start = COALESCE(?, half_checkout_start),
        half_checkout_end = COALESCE(?, half_checkout_end),
        half_checkin_start = COALESCE(?, half_checkin_start),
        half_checkin_end = COALESCE(?, half_checkin_end),
        checkout_target = COALESCE(?, checkout_target),
        checkout_start = COALESCE(?, checkout_start),
        checkout_end = COALESCE(?, checkout_end),
        full_day_required_minutes = COALESCE(?, full_day_required_minutes),
        half_day_required_minutes = COALESCE(?, half_day_required_minutes),
        late_compensation_enabled = COALESCE(?, late_compensation_enabled),
        allow_admin_override = COALESCE(?, allow_admin_override),
        updated_at = ?
      WHERE id = ?
    `).run(
      rule_name,
      checkin_target,
      checkin_start,
      checkin_end,
      half_checkout_start,
      half_checkout_end,
      half_checkin_start,
      half_checkin_end,
      checkout_target,
      checkout_start,
      checkout_end,
      full_day_required_minutes,
      half_day_required_minutes,
      late_compensation_enabled !== undefined ? (late_compensation_enabled ? 1 : 0) : null,
      allow_admin_override !== undefined ? (allow_admin_override ? 1 : 0) : null,
      now,
      current.id
    );

    db.prepare(`
      INSERT INTO audit_logs (event_type, description, metadata, admin_username, created_at)
      VALUES ('RULES_UPDATED', ?, ?, ?, datetime('now'))
    `).run(
      'Attendance rules and timing windows updated',
      JSON.stringify(req.body),
      req.admin ? req.admin.username : 'admin'
    );

    const updated = getActiveRule(db);
    return res.json({ success: true, rule: updated });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

