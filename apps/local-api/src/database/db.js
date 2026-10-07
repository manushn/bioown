import { DB_PATH, DB_DIR } from '../config/security.js';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

let dbInstance = null;
let dbDriverType = 'none';

export function getDb() {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  // 1. Try better-sqlite3 first
  try {
    const BetterSqlite = require('better-sqlite3');
    dbInstance = new BetterSqlite(DB_PATH, { verbose: process.env.DEBUG_SQL ? console.log : null });
    dbInstance.pragma('foreign_keys = ON');
    dbInstance.pragma('journal_mode = WAL');
    dbDriverType = 'better-sqlite3';
    return dbInstance;
  } catch (err) {
    // 2. Fall back to Node.js native sqlite (Node 22+)
    try {
      const { DatabaseSync } = require('node:sqlite');
      const nativeDb = new DatabaseSync(DB_PATH);
      nativeDb.exec('PRAGMA foreign_keys = ON;');
      nativeDb.exec('PRAGMA journal_mode = WAL;');

      // Wrap nativeDb to match better-sqlite3 interface
      dbInstance = {
        _native: nativeDb,
        prepare(sql) {
          const stmt = nativeDb.prepare(sql);
          return {
            all(...params) {
              return stmt.all(...params);
            },
            get(...params) {
              return stmt.get(...params);
            },
            run(...params) {
              const res = stmt.run(...params);
              return {
                changes: res.changes,
                lastInsertRowid: res.lastInsertRowid
              };
            }
          };
        },
        exec(sql) {
          return nativeDb.exec(sql);
        },
        pragma(pragmaStr) {
          try {
            return nativeDb.exec(`PRAGMA ${pragmaStr};`);
          } catch (e) {
            return null;
          }
        },
        transaction(fn) {
          return (...args) => {
            nativeDb.exec('BEGIN TRANSACTION;');
            try {
              const result = fn(...args);
              nativeDb.exec('COMMIT;');
              return result;
            } catch (error) {
              nativeDb.exec('ROLLBACK;');
              throw error;
            }
          };
        },
        close() {
          return nativeDb.close();
        }
      };
      dbDriverType = 'node:sqlite';
      return dbInstance;
    } catch (fallbackErr) {
      throw new Error(`Failed to initialize SQLite database: ${err.message} and fallback: ${fallbackErr.message}`);
    }
  }
}

export function getDbDriverType() {
  return dbDriverType;
}

export function closeDb() {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch (e) {
      console.error('Error closing database:', e);
    }
    dbInstance = null;
  }
}

