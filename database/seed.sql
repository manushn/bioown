-- Seed data for College Staff Attendance System

-- Initial Attendance Rule
INSERT OR IGNORE INTO attendance_rules (
    id, rule_name, checkin_target, checkin_start, checkin_end,
    half_checkout_start, half_checkout_end, half_checkin_start, half_checkin_end,
    checkout_target, checkout_start, checkout_end,
    full_day_required_minutes, half_day_required_minutes,
    late_compensation_enabled, allow_admin_override,
    active, created_at, updated_at
) VALUES (
    1, 'Standard College Staff Timings',
    '09:25:00', '08:00:00', '11:00:00',
    '12:00:00', '14:30:00', '14:31:00', '16:00:00',
    '17:30:00', '16:01:00', '20:00:00',
    420, 210,
    1, 1,
    1, datetime('now'), datetime('now')
);

-- Initial App Settings
INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES 
('institution_name', 'NiceTech College of Engineering & Technology', datetime('now')),
('terminal_id', 'TERM-MAIN-01', datetime('now')),
('device_type', 'MFS100 V54', datetime('now')),
('simulator_mode', 'true', datetime('now')),
('sync_enabled', 'false', datetime('now')),
('sync_url', 'https://api.nicetech.college/sync', datetime('now'));

-- Initial Sample Staff Members
INSERT OR IGNORE INTO staff (id, staff_id, name, department, designation, phone, email, active, created_at, updated_at) VALUES
(1, 'STF101', 'Dr. Rajesh Kumar', 'Computer Science & Engineering', 'Professor & HOD', '9876543210', 'rajesh.cse@nicetech.edu', 1, datetime('now'), datetime('now')),
(2, 'STF102', 'Prof. Priya Sharma', 'Information Technology', 'Assistant Professor', '9876543211', 'priya.it@nicetech.edu', 1, datetime('now'), datetime('now')),
(3, 'STF103', 'Dr. Anand Verma', 'Electronics & Communication', 'Associate Professor', '9876543212', 'anand.ece@nicetech.edu', 1, datetime('now'), datetime('now')),
(4, 'STF104', 'Kavitha Sundaram', 'Mechanical Engineering', 'Assistant Professor', '9876543213', 'kavitha.mech@nicetech.edu', 1, datetime('now'), datetime('now')),
(5, 'STF105', 'Manoj Narayanan', 'Civil Engineering', 'Lab Instructor', '9876543214', 'manoj.civil@nicetech.edu', 1, datetime('now'), datetime('now')),
(6, 'STF106', 'Sangeetha R.', 'Computer Science & Engineering', 'Assistant Professor', '9876543215', 'sangeetha.cse@nicetech.edu', 1, datetime('now'), datetime('now')),
(7, 'STF107', 'Gopalakrishnan V.', 'Administration', 'Office Superintendent', '9876543216', 'gopal.admin@nicetech.edu', 1, datetime('now'), datetime('now'));

-- Sample Fingerprint Enrolled Status (Mock ANSI-378 templates)
INSERT OR IGNORE INTO fingerprints (id, staff_id, finger_index, template_data, template_format, active, created_at, updated_at) VALUES
(1, 'STF101', 1, 'MFS101_ANSI378_SAMPLE_TEMPLATE_DATA_RIGHT_INDEX', 'ANSI378', 1, datetime('now'), datetime('now')),
(2, 'STF102', 1, 'MFS102_ANSI378_SAMPLE_TEMPLATE_DATA_RIGHT_INDEX', 'ANSI378', 1, datetime('now'), datetime('now')),
(3, 'STF103', 1, 'MFS103_ANSI378_SAMPLE_TEMPLATE_DATA_RIGHT_INDEX', 'ANSI378', 1, datetime('now'), datetime('now')),
(4, 'STF104', 1, 'MFS104_ANSI378_SAMPLE_TEMPLATE_DATA_RIGHT_INDEX', 'ANSI378', 1, datetime('now'), datetime('now')),
(5, 'STF105', 1, 'MFS105_ANSI378_SAMPLE_TEMPLATE_DATA_RIGHT_INDEX', 'ANSI378', 1, datetime('now'), datetime('now'));

