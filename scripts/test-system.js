import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { getDb, closeDb } from '../apps/local-api/src/database/db.js';
import { initDatabase } from '../apps/local-api/src/database/init.js';
import { 
  getActiveRule, 
  processStaffAttendanceForDate, 
  generateAttendanceReport 
} from '../apps/local-api/src/attendance/engine.js';
import { hashPassword, comparePassword } from '../apps/local-api/src/utils/password.js';
import { signToken, verifyToken } from '../apps/local-api/src/middleware/auth.js';
import { getDeviceStatus, setSimulatorState } from '../apps/local-api/src/services/deviceService.js';
import { createBackup, validateBackupFile, restoreBackup, listBackups } from '../apps/local-api/src/backup/backupManager.js';

async function runTests() {
  console.log('====================================================');
  console.log(' Running Comprehensive System Verification Tests');
  console.log('====================================================');

  // Test 1: Database Initialization
  console.log('\n[Test 1] Database Initialization & Seeding...');
  const db = await initDatabase();
  const staffRows = db.prepare('SELECT COUNT(*) as count FROM staff').get();
  assert(staffRows.count > 0, 'Staff table should contain seed rows');
  console.log(`  ✓ Database initialized with ${staffRows.count} faculty members`);

  // Test 2: Admin Auth & Bcrypt
  console.log('\n[Test 2] Admin Authentication & Password Hashing...');
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get('niadmin');
  assert(admin, 'Default admin niadmin must exist');
  assert.strictEqual(admin.must_change_password, 1, 'must_change_password should be 1');
  const validPass = await comparePassword('ni2027', admin.password_hash);
  assert(validPass, 'Password comparison for ni2027 should succeed');
  const invalidPass = await comparePassword('wrongpass', admin.password_hash);
  assert(!invalidPass, 'Invalid password should be rejected');
  const token = signToken({ id: admin.id, username: admin.username });
  const decoded = verifyToken(token);
  assert.strictEqual(decoded.username, 'niadmin', 'JWT verification should match username');
  console.log('  ✓ Admin credentials, bcrypt hashing, and JWT tokens verified');

  // Test 3: Attendance Calculation & Late Compensation Rule
  console.log('\n[Test 3] Attendance Engine & Late Compensation...');
  const rule = getActiveRule(db);
  assert(rule.checkin_target === '09:25:00', 'Default checkin target should be 09:25:00');
  assert.strictEqual(rule.late_compensation_enabled, 1, 'Late compensation should be enabled');

  const testStaff = db.prepare('SELECT * FROM staff WHERE staff_id = ?').get('STF101');
  const testDate = '2026-10-07';

  // Clean any existing test punches for STF101 on testDate
  db.prepare('DELETE FROM punches WHERE staff_id = ? AND punch_date = ?').run('STF101', testDate);

  // Insert morning punch at 09:30:00 (5 minutes late)
  db.prepare(`
    INSERT INTO punches (staff_id, punch_date, punch_time, terminal_id, capture_type, created_at)
    VALUES (?, ?, ?, 'TERM-01', 'FINGERPRINT', datetime('now'))
  `).run('STF101', testDate, '09:30:00');

  let att = processStaffAttendanceForDate(testStaff, testDate, rule, db);
  assert.strictEqual(att.in_time, '09:30:00', 'In time should match');
  assert.strictEqual(att.late_minutes, 5, 'Should be 5 minutes late');
  assert.strictEqual(att.in_status, 'LATE', 'In status should be LATE');
  // Check late compensation: 17:30 + 5 mins = 17:35:00
  assert.strictEqual(att.expected_out_time, '17:35:00', 'Expected checkout must be compensated to 17:35:00');
  console.log('  ✓ Check-in late calculation and compensation shift verified (09:30 -> expected 17:35)');

  // Insert midday leave at 13:00:00 and return at 14:45:00
  db.prepare(`
    INSERT INTO punches (staff_id, punch_date, punch_time, terminal_id, capture_type, created_at)
    VALUES (?, ?, ?, 'TERM-01', 'FINGERPRINT', datetime('now'))
  `).run('STF101', testDate, '13:00:00');
  db.prepare(`
    INSERT INTO punches (staff_id, punch_date, punch_time, terminal_id, capture_type, created_at)
    VALUES (?, ?, ?, 'TERM-01', 'FINGERPRINT', datetime('now'))
  `).run('STF101', testDate, '14:45:00');

  // Insert final checkout at 17:36:00 (On time according to 17:35 compensated expected out)
  db.prepare(`
    INSERT INTO punches (staff_id, punch_date, punch_time, terminal_id, capture_type, created_at)
    VALUES (?, ?, ?, 'TERM-01', 'FINGERPRINT', datetime('now'))
  `).run('STF101', testDate, '17:36:00');

  att = processStaffAttendanceForDate(testStaff, testDate, rule, db);
  assert.strictEqual(att.punches.length, 4, 'Should record all 4 punch cycles');
  assert.strictEqual(att.out_status, 'ON_TIME', 'Checkout at 17:36 >= 17:35 expected out is ON_TIME');
  console.log(`  ✓ 4-punch daily cycle verified: Working duration = ${att.working_duration}, Status = ${att.status}`);

  // Test 4: Admin Override
  console.log('\n[Test 4] Admin Status Override...');
  db.prepare(`
    INSERT INTO attendance_overrides (staff_id, attendance_date, original_status, override_status, reason, admin_id, created_at)
    VALUES (?, ?, ?, 'FULL DAY', 'Official Exam Duty', 'niadmin', datetime('now'))
    ON CONFLICT(staff_id, attendance_date) DO UPDATE SET override_status = excluded.override_status
  `).run('STF101', testDate, att.status);

  const overriddenAtt = processStaffAttendanceForDate(testStaff, testDate, rule, db);
  assert.strictEqual(overriddenAtt.is_override, true, 'is_override should be true');
  assert.strictEqual(overriddenAtt.status, 'FULL DAY', 'Status should be overridden to FULL DAY');
  assert.strictEqual(overriddenAtt.override_reason, 'Official Exam Duty');
  console.log('  ✓ Admin override takes precedence while preserving original punches');

  // Test 5: Report Generation
  console.log('\n[Test 5] Attendance Report Generation...');
  const report = generateAttendanceReport({ fromDate: testDate, toDate: testDate });
  assert(report.summary.totalRecords > 0, 'Report must contain records');
  assert(report.records.some(r => r.staff_id === 'STF101'), 'STF101 must be in report');
  console.log(`  ✓ Report generated for ${report.summary.totalRecords} records (Present: ${report.summary.present}, Absent: ${report.summary.absent})`);

  // Test 6: Device Service & Simulator
  console.log('\n[Test 6] Device Diagnostics & Simulator Mode...');
  const devStatus = await getDeviceStatus();
  assert(devStatus.status === 'READY', 'Simulator device should report READY');
  assert(devStatus.usbDetected === true, 'USB should be detected');
  console.log(`  ✓ Device diagnostics OK: ${devStatus.device} (${devStatus.status})`);

  // Test 7: Backup, Validation & Safety Rollback
  console.log('\n[Test 7] Backup Creation & Disaster Recovery...');
  const backupRes = await createBackup('test-admin');
  assert(backupRes.filename.endsWith('.db'), 'Backup file must end with .db');
  assert(fs.existsSync(backupRes.filePath), 'Backup file must exist on disk');

  const valRes = await validateBackupFile(backupRes.filePath);
  assert(valRes.valid, 'Backup validation must pass');
  assert(valRes.staffCount > 0, 'Backup must contain staff data');
  console.log(`  ✓ Created snapshot: ${backupRes.filename} (${Math.round(backupRes.sizeBytes / 1024)} KB, checksum verified)`);

  const restoreRes = await restoreBackup(backupRes.filePath, 'test-admin');
  assert(restoreRes.success, 'Restore must succeed');
  assert(restoreRes.safetyBackup.startsWith('pre-restore-backup'), 'Mandatory safety backup must be generated');
  console.log(`  ✓ Verified restore with safety backup: ${restoreRes.safetyBackup}`);

  console.log('\n====================================================');
  console.log(' ALL SYSTEM VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});

