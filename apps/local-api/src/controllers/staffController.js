import { getDb } from '../database/db.js';

export function getAllStaff(req, res) {
  try {
    const db = getDb();
    const activeOnly = req.query.active !== 'false';
    const dept = req.query.department;
    const search = req.query.search;

    let query = `
      SELECT s.*, 
        COUNT(f.id) as enrolled_fingerprints,
        GROUP_CONCAT(f.finger_index) as enrolled_finger_indices
      FROM staff s
      LEFT JOIN fingerprints f ON s.staff_id = f.staff_id AND f.active = 1
      WHERE 1=1
    `;
    const params = [];

    if (activeOnly) {
      query += ' AND s.active = 1';
    }
    if (dept && dept !== 'All') {
      query += ' AND s.department = ?';
      params.push(dept);
    }
    if (search) {
      query += ' AND (s.name LIKE ? OR s.staff_id LIKE ? OR s.designation LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' GROUP BY s.id ORDER BY s.department ASC, s.name ASC';

    const staffList = db.prepare(query).all(...params);
    return res.json(staffList);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export function getStaffById(req, res) {
  try {
    const db = getDb();
    const staff = db.prepare('SELECT * FROM staff WHERE id = ? OR staff_id = ?').get(req.params.id, req.params.id);
    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    const fingerprints = db.prepare(`
      SELECT id, finger_index, template_format, created_at, updated_at
      FROM fingerprints 
      WHERE staff_id = ? AND active = 1
      ORDER BY finger_index ASC
    `).all(staff.staff_id);

    return res.json({
      ...staff,
      fingerprints
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export function createStaff(req, res) {
  try {
    const { staff_id, name, department, designation, phone, email } = req.body;
    if (!staff_id || !name || !department || !designation) {
      return res.status(400).json({ error: 'staff_id, name, department, and designation are required' });
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM staff WHERE staff_id = ?').get(staff_id);
    if (existing) {
      return res.status(409).json({ error: `Staff ID '${staff_id}' already exists.` });
    }

    const now = new Date().toISOString();
    const result = db.prepare(`
      INSERT INTO staff (staff_id, name, department, designation, phone, email, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(staff_id, name, department, designation, phone || null, email || null, now, now);

    db.prepare(`
      INSERT INTO audit_logs (event_type, description, metadata, admin_username, created_at)
      VALUES ('STAFF_CREATED', ?, ?, ?, datetime('now'))
    `).run(
      `Created staff member ${name} (${staff_id})`,
      JSON.stringify({ staff_id, name, department, designation }),
      req.admin ? req.admin.username : 'admin'
    );

    return res.status(201).json({
      success: true,
      id: result.lastInsertRowid,
      staff_id,
      message: 'Staff member created successfully'
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export function updateStaff(req, res) {
  try {
    const { name, department, designation, phone, email, active } = req.body;
    const db = getDb();
    const staff = db.prepare('SELECT * FROM staff WHERE id = ? OR staff_id = ?').get(req.params.id, req.params.id);
    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE staff SET
        name = COALESCE(?, name),
        department = COALESCE(?, department),
        designation = COALESCE(?, designation),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        active = COALESCE(?, active),
        updated_at = ?
      WHERE id = ?
    `).run(
      name,
      department,
      designation,
      phone,
      email,
      active !== undefined ? (active ? 1 : 0) : null,
      now,
      staff.id
    );

    db.prepare(`
      INSERT INTO audit_logs (event_type, description, metadata, admin_username, created_at)
      VALUES ('STAFF_UPDATED', ?, ?, ?, datetime('now'))
    `).run(
      `Updated staff member ${staff.staff_id}`,
      JSON.stringify({ staff_id: staff.staff_id, name, department }),
      req.admin ? req.admin.username : 'admin'
    );

    return res.json({ success: true, message: 'Staff member updated successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export function deleteStaff(req, res) {
  try {
    const db = getDb();
    const staff = db.prepare('SELECT * FROM staff WHERE id = ? OR staff_id = ?').get(req.params.id, req.params.id);
    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    // Soft deactivate by default to preserve punch integrity
    db.prepare(`UPDATE staff SET active = 0, updated_at = datetime('now') WHERE id = ?`).run(staff.id);

    db.prepare(`
      INSERT INTO audit_logs (event_type, description, metadata, admin_username, created_at)
      VALUES ('STAFF_DEACTIVATED', ?, ?, ?, datetime('now'))
    `).run(
      `Deactivated staff member ${staff.name} (${staff.staff_id})`,
      JSON.stringify({ staff_id: staff.staff_id }),
      req.admin ? req.admin.username : 'admin'
    );

    return res.json({ success: true, message: 'Staff member deactivated successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export function enrollFingerprint(req, res) {
  try {
    const { finger_index, template_data, template_format } = req.body;
    const db = getDb();
    const staff = db.prepare('SELECT * FROM staff WHERE id = ? OR staff_id = ?').get(req.params.id, req.params.id);
    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    if (finger_index === undefined || !template_data) {
      return res.status(400).json({ error: 'finger_index and template_data are required' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO fingerprints (staff_id, finger_index, template_data, template_format, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT(staff_id, finger_index) DO UPDATE SET
        template_data = excluded.template_data,
        template_format = excluded.template_format,
        active = 1,
        updated_at = excluded.updated_at
    `).run(staff.staff_id, finger_index, template_data, template_format || 'ANSI378', now, now);

    db.prepare(`
      INSERT INTO audit_logs (event_type, description, metadata, admin_username, created_at)
      VALUES ('FINGERPRINT_ENROLLED', ?, ?, ?, datetime('now'))
    `).run(
      `Enrolled fingerprint (index ${finger_index}) for ${staff.name} (${staff.staff_id})`,
      JSON.stringify({ staff_id: staff.staff_id, finger_index }),
      req.admin ? req.admin.username : 'admin'
    );

    return res.json({ success: true, message: `Fingerprint index ${finger_index} enrolled successfully` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export function removeFingerprint(req, res) {
  try {
    const db = getDb();
    const staff = db.prepare('SELECT * FROM staff WHERE id = ? OR staff_id = ?').get(req.params.id, req.params.id);
    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    const fingerIndex = Number(req.params.fingerIndex);
    db.prepare('DELETE FROM fingerprints WHERE staff_id = ? AND finger_index = ?').run(staff.staff_id, fingerIndex);

    db.prepare(`
      INSERT INTO audit_logs (event_type, description, metadata, admin_username, created_at)
      VALUES ('FINGERPRINT_REMOVED', ?, ?, ?, datetime('now'))
    `).run(
      `Removed fingerprint (index ${fingerIndex}) for ${staff.staff_id}`,
      JSON.stringify({ staff_id: staff.staff_id, fingerIndex }),
      req.admin ? req.admin.username : 'admin'
    );

    return res.json({ success: true, message: 'Fingerprint removed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

