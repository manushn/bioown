import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Application data root directory
// On Windows production: %ProgramData%\CollegeStaffAttendance\ or configurable
// In local dev: ./data/
const IS_WIN = process.platform === 'win32';
export const APP_DATA_DIR = process.env.ATTENDANCE_DATA_DIR || 
  (IS_WIN && process.env.ProgramData 
    ? path.join(process.env.ProgramData, 'CollegeStaffAttendance')
    : path.resolve(__dirname, '../../../../'));

export const DB_DIR = path.join(APP_DATA_DIR, 'data');
export const BACKUP_DIR = path.join(APP_DATA_DIR, 'backups');
export const RESTORE_INBOX_DIR = path.join(APP_DATA_DIR, 'restore-inbox');
export const RESTORE_PROCESSED_DIR = path.join(RESTORE_INBOX_DIR, 'processed');
export const LOGS_DIR = path.join(APP_DATA_DIR, 'logs');
export const CONFIG_DIR = path.join(APP_DATA_DIR, 'config');
export const DB_PATH = path.join(DB_DIR, 'attendance.db');

// Ensure essential directories exist
for (const dir of [DB_DIR, BACKUP_DIR, RESTORE_INBOX_DIR, RESTORE_PROCESSED_DIR, LOGS_DIR, CONFIG_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Security config file
const SECURITY_FILE = path.join(CONFIG_DIR, 'security.json');

// Default security config
const DEFAULT_SECURITY = {
  jwtSecret: crypto.randomBytes(32).toString('hex'),
  recoveryKey: 'RECOVERY-NICETECH-2027-KEY-SECURE',
  defaultAdminUsername: 'niadmin',
  defaultAdminPassword: 'ni2027',
  sessionExpiryHours: 12,
  maxFailedLogins: 5
};

export function getSecurityConfig() {
  try {
    if (!fs.existsSync(SECURITY_FILE)) {
      fs.writeFileSync(SECURITY_FILE, JSON.stringify(DEFAULT_SECURITY, null, 2), 'utf8');
      return DEFAULT_SECURITY;
    }
    const data = fs.readFileSync(SECURITY_FILE, 'utf8');
    return { ...DEFAULT_SECURITY, ...JSON.parse(data) };
  } catch (err) {
    console.error('Error reading security config, using default:', err);
    return DEFAULT_SECURITY;
  }
}

export function updateSecurityConfig(updates) {
  const current = getSecurityConfig();
  const next = { ...current, ...updates };
  fs.writeFileSync(SECURITY_FILE, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

