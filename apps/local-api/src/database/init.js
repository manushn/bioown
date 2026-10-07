import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb } from './db.js';
import { hashPassword } from '../utils/password.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initDatabase() {
  const db = getDb();
  const schemaPath = path.resolve(__dirname, '../../../../database/schema.sql');
  const seedPath = path.resolve(__dirname, '../../../../database/seed.sql');

  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
  }

  // Ensure default admin exists
  const existingAdmin = db.prepare('SELECT id, username FROM admins WHERE username = ?').get('niadmin');
  if (!existingAdmin) {
    const defaultHash = await hashPassword('ni2027');
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO admins (username, password_hash, must_change_password, active, created_at, updated_at)
      VALUES (?, ?, 1, 1, ?, ?)
    `).run('niadmin', defaultHash, now, now);
    console.log('[DB] Created default admin account: niadmin (must_change_password = 1)');
  }

  // Run seed data if seed exists and staff table is empty
  const staffCount = db.prepare('SELECT COUNT(*) as count FROM staff').get().count;
  if (staffCount === 0 && fs.existsSync(seedPath)) {
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    db.exec(seedSql);
    console.log('[DB] Seed data populated successfully');
  }

  console.log('[DB] Database initialized successfully');
  return db;
}

// Allow direct CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  initDatabase().catch(err => {
    console.error('[DB] Initialization failed:', err);
    process.exit(1);
  });
}

