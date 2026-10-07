import { getDb } from '../database/db.js';

export function getAuditLogs(req, res) {
  try {
    const db = getDb();
    const eventType = req.query.eventType;
    const limit = Math.min(Number(req.query.limit) || 100, 200);

    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (eventType) {
      query += ' AND event_type = ?';
      params.push(eventType);
    }

    query += ' ORDER BY id DESC LIMIT ?';
    params.push(limit);

    const rows = db.prepare(query).all(...params);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

