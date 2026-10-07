import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getDb, closeDb } from '../database/db.js';
import { DB_PATH, BACKUP_DIR, RESTORE_INBOX_DIR, RESTORE_PROCESSED_DIR } from '../config/security.js';

/**
 * Calculate SHA-256 checksum of a file
 */
export function calculateFileChecksum(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

/**
 * Format timestamp for backup filename: YYYY-MM-DD-HHmmss
 */
function getTimestampString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}-${hours}${minutes}${seconds}`;
}

/**
 * Validate SQLite database file integrity and schema requirements
 */
export async function validateBackupFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { valid: false, message: 'File does not exist' };
  }

  const stat = fs.statSync(filePath);
  if (stat.size < 100) {
    return { valid: false, message: 'File is too small to be a valid database' };
  }

  // Read SQLite header
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(16);
  fs.readSync(fd, buffer, 0, 16, 0);
  fs.closeSync(fd);

  const headerStr = buffer.toString('utf8', 0, 15);
  if (headerStr !== 'SQLite format 3') {
    return { valid: false, message: 'Invalid database header, not a valid SQLite database' };
  }

  // Attempt opening and verifying required tables
  let testDb = null;
  try {
    const { createRequire } = await import('node:module');
    const require = createRequire(import.meta.url);
    const { DatabaseSync } = require('node:sqlite');
    testDb = new DatabaseSync(filePath);
    
    // Check integrity pragma
    const integrityRow = testDb.prepare('PRAGMA quick_check;').get();
    const integrityResult = Object.values(integrityRow || {})[0];
    if (integrityResult !== 'ok') {
      return { valid: false, message: `Database integrity check failed: ${integrityResult}` };
    }

    // Check required tables
    const tables = testDb.prepare(`
      SELECT name FROM sqlite_master WHERE type='table';
    `).all().map(r => r.name);

    const requiredTables = ['staff', 'punches', 'attendance_rules', 'admins'];
    const missingTables = requiredTables.filter(t => !tables.includes(t));

    if (missingTables.length > 0) {
      return { valid: false, message: `Missing required tables: ${missingTables.join(', ')}` };
    }

    const staffCount = testDb.prepare('SELECT COUNT(*) as c FROM staff').get().c;
    const punchesCount = testDb.prepare('SELECT COUNT(*) as c FROM punches').get().c;

    return {
      valid: true,
      message: 'Backup is valid and healthy',
      staffCount,
      punchesCount,
      sizeBytes: stat.size,
      checksum: calculateFileChecksum(filePath)
    };
  } catch (err) {
    return { valid: false, message: `Database validation error: ${err.message}` };
  } finally {
    if (testDb) {
      try { testDb.close(); } catch (e) {}
    }
  }
}

/**
 * Create a safe timestamped SQLite backup
 */
export async function createBackup(adminUsername = 'admin') {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error('Active database file does not exist');
  }

  const timestamp = getTimestampString();
  const backupFilename = `attendance-backup-${timestamp}.db`;
  const backupFilePath = path.join(BACKUP_DIR, backupFilename);

  // Copy current active database safely
  fs.copyFileSync(DB_PATH, backupFilePath);

  // Validate the created backup
  const validation = await validateBackupFile(backupFilePath);
  if (!validation.valid) {
    if (fs.existsSync(backupFilePath)) fs.unlinkSync(backupFilePath);
    throw new Error(`Backup verification failed: ${validation.message}`);
  }

  const checksum = validation.checksum;
  const sizeBytes = validation.sizeBytes;
  const now = new Date().toISOString();

  // Create manifest file
  const manifest = {
    app_version: '1.0.0',
    schema_version: 1,
    backup_file: backupFilename,
    created_at: now,
    created_by: adminUsername,
    staff_count: validation.staffCount,
    punches_count: validation.punchesCount,
    checksum: checksum,
    size_bytes: sizeBytes
  };
  fs.writeFileSync(
    path.join(BACKUP_DIR, `attendance-backup-${timestamp}-manifest.json`),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );

  // Record in backup history and audit log
  const db = getDb();
  db.prepare(`
    INSERT INTO backup_history (filename, filepath, size_bytes, checksum, status, created_at)
    VALUES (?, ?, ?, ?, 'VALID', ?)
  `).run(backupFilename, backupFilePath, sizeBytes, checksum, now);

  db.prepare(`
    INSERT INTO audit_logs (event_type, description, metadata, admin_username, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run('BACKUP_CREATED', `Database backup created: ${backupFilename}`, JSON.stringify(manifest), adminUsername, now);

  return {
    filename: backupFilename,
    filePath: backupFilePath,
    sizeBytes,
    checksum,
    manifest
  };
}

/**
 * Restore database from a backup file with mandatory safety backup
 */
export async function restoreBackup(targetBackupPath, adminUsername = 'admin') {
  const validation = await validateBackupFile(targetBackupPath);
  if (!validation.valid) {
    throw new Error(`Cannot restore invalid backup: ${validation.message}`);
  }

  // 1. Mandatory safety backup of current active database
  const timestamp = getTimestampString();
  const safetyBackupFilename = `pre-restore-backup-${timestamp}.db`;
  const safetyBackupPath = path.join(BACKUP_DIR, safetyBackupFilename);

  if (fs.existsSync(DB_PATH)) {
    fs.copyFileSync(DB_PATH, safetyBackupPath);
  }

  // 2. Close active DB connection before file replacement
  closeDb();

  // 3. Replace active database file
  fs.copyFileSync(targetBackupPath, DB_PATH);

  // 4. Reopen database and record restore history
  const db = getDb();
  const now = new Date().toISOString();
  const filename = path.basename(targetBackupPath);

  db.prepare(`
    INSERT INTO restore_history (backup_filename, safety_backup_path, status, details, restored_at)
    VALUES (?, ?, 'SUCCESS', ?, ?)
  `).run(filename, safetyBackupPath, `Restored by ${adminUsername}. Validation: ${validation.message}`, now);

  db.prepare(`
    INSERT INTO audit_logs (event_type, description, metadata, admin_username, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    'BACKUP_RESTORED',
    `Database restored from ${filename}. Safety backup saved to ${safetyBackupFilename}`,
    JSON.stringify({ restoredFile: filename, safetyBackup: safetyBackupFilename, validation }),
    adminUsername,
    now
  );

  return {
    success: true,
    restoredFile: filename,
    safetyBackup: safetyBackupFilename,
    message: 'Database restored successfully'
  };
}

/**
 * List all available backups
 */
export function listBackups(db = getDb()) {
  const history = db.prepare(`
    SELECT * FROM backup_history ORDER BY id DESC LIMIT 50
  `).all();

  // Also scan physical backup directory for any external files
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.db') && !f.startsWith('pre-restore'))
    .map(f => {
      const fullPath = path.join(BACKUP_DIR, f);
      const stat = fs.statSync(fullPath);
      return {
        filename: f,
        size_bytes: stat.size,
        created_at: stat.mtime.toISOString(),
        is_physical: true
      };
    });

  return {
    history,
    files
  };
}

/**
 * Check restore-inbox for automatically placed newer backups
 */
export async function checkAndProcessRestoreInbox() {
  if (!fs.existsSync(RESTORE_INBOX_DIR)) return null;

  const inboxFiles = fs.readdirSync(RESTORE_INBOX_DIR)
    .filter(f => f.endsWith('.db') && !fs.statSync(path.join(RESTORE_INBOX_DIR, f)).isDirectory());

  if (inboxFiles.length === 0) return null;

  // Process the newest backup in inbox
  const targetFile = inboxFiles[0];
  const targetPath = path.join(RESTORE_INBOX_DIR, targetFile);

  console.log(`[RESTORE-INBOX] Detected incoming backup file: ${targetFile}`);
  const validation = await validateBackupFile(targetPath);
  if (!validation.valid) {
    console.warn(`[RESTORE-INBOX] File ${targetFile} is invalid: ${validation.message}`);
    return null;
  }

  const result = await restoreBackup(targetPath, 'SYSTEM_RESTORE_INBOX');

  // Move to processed folder
  const processedDest = path.join(RESTORE_PROCESSED_DIR, `${Date.now()}_${targetFile}`);
  fs.renameSync(targetPath, processedDest);
  console.log(`[RESTORE-INBOX] Restored and moved to ${processedDest}`);

  return result;
}

