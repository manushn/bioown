-- College Staff Fingerprint Attendance System — SQLite Schema
PRAGMA foreign_keys = ON;

-- 1. Admins Table
CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    must_change_password INTEGER NOT NULL DEFAULT 1,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_login_at TEXT
);

-- 2. Staff Table
CREATE TABLE IF NOT EXISTS staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    department TEXT NOT NULL,
    designation TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 3. Fingerprints Table
CREATE TABLE IF NOT EXISTS fingerprints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id TEXT NOT NULL,
    finger_index INTEGER NOT NULL,
    template_data TEXT NOT NULL,
    template_format TEXT NOT NULL DEFAULT 'ANSI378',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE,
    UNIQUE(staff_id, finger_index)
);

-- 4. Raw Punches Table (Immutable capture events)
CREATE TABLE IF NOT EXISTS punches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id TEXT NOT NULL,
    punch_date TEXT NOT NULL,
    punch_time TEXT NOT NULL,
    terminal_id TEXT NOT NULL DEFAULT 'TERM-01',
    capture_type TEXT NOT NULL DEFAULT 'FINGERPRINT',
    created_at TEXT NOT NULL,
    FOREIGN KEY (staff_id) REFERENCES staff(staff_id)
);

-- 5. Attendance Rules Table
CREATE TABLE IF NOT EXISTS attendance_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_name TEXT NOT NULL,
    checkin_target TEXT NOT NULL DEFAULT '09:25:00',
    checkin_start TEXT NOT NULL DEFAULT '08:00:00',
    checkin_end TEXT NOT NULL DEFAULT '11:00:00',
    half_checkout_start TEXT NOT NULL DEFAULT '12:00:00',
    half_checkout_end TEXT NOT NULL DEFAULT '14:30:00',
    half_checkin_start TEXT NOT NULL DEFAULT '14:31:00',
    half_checkin_end TEXT NOT NULL DEFAULT '16:00:00',
    checkout_target TEXT NOT NULL DEFAULT '17:30:00',
    checkout_start TEXT NOT NULL DEFAULT '16:01:00',
    checkout_end TEXT NOT NULL DEFAULT '20:00:00',
    full_day_required_minutes INTEGER NOT NULL DEFAULT 420,
    half_day_required_minutes INTEGER NOT NULL DEFAULT 210,
    late_compensation_enabled INTEGER NOT NULL DEFAULT 1,
    allow_admin_override INTEGER NOT NULL DEFAULT 1,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 6. Attendance Overrides Table
CREATE TABLE IF NOT EXISTS attendance_overrides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id TEXT NOT NULL,
    attendance_date TEXT NOT NULL,
    original_status TEXT NOT NULL,
    override_status TEXT NOT NULL,
    reason TEXT NOT NULL,
    admin_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (staff_id) REFERENCES staff(staff_id),
    UNIQUE(staff_id, attendance_date)
);

-- 7. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata TEXT,
    admin_username TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL
);

-- 8. Backup History Table
CREATE TABLE IF NOT EXISTS backup_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    checksum TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'VALID',
    created_at TEXT NOT NULL
);

-- 9. Restore History Table
CREATE TABLE IF NOT EXISTS restore_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    backup_filename TEXT NOT NULL,
    safety_backup_path TEXT NOT NULL,
    status TEXT NOT NULL,
    details TEXT,
    restored_at TEXT NOT NULL
);

-- 10. Application Settings Table
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Indices for rapid attendance querying
CREATE INDEX IF NOT EXISTS idx_punches_staff_date ON punches(staff_id, punch_date);
CREATE INDEX IF NOT EXISTS idx_punches_date ON punches(punch_date);
CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(active);
CREATE INDEX IF NOT EXISTS idx_staff_dept ON staff(department);
CREATE INDEX IF NOT EXISTS idx_fingerprints_staff ON fingerprints(staff_id);
CREATE INDEX IF NOT EXISTS idx_overrides_staff_date ON attendance_overrides(staff_id, attendance_date);

