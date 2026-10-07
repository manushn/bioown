import path from 'node:path';
import fs from 'node:fs';
import { getDb } from '../database/db.js';
import * as backupManager from '../backup/backupManager.js';
import { BACKUP_DIR } from '../config/security.js';

export async function createBackup(req, res) {
  try {
    const admin = req.admin ? req.admin.username : 'admin';
    const result = await backupManager.createBackup(admin);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export function listBackups(req, res) {
  try {
    const data = backupManager.listBackups();
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export function downloadBackup(req, res) {
  try {
    const filename = req.params.filename;
    // Security check against directory traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(BACKUP_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }

    res.download(filePath, safeFilename);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function validateBackup(req, res) {
  try {
    let filePath = req.body.filePath;
    if (!filePath && req.body.filename) {
      filePath = path.join(BACKUP_DIR, path.basename(req.body.filename));
    }

    if (!filePath) {
      return res.status(400).json({ error: 'filePath or filename is required' });
    }

    const result = await backupManager.validateBackupFile(filePath);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function restoreBackup(req, res) {
  try {
    let filePath = req.body.filePath;
    if (!filePath && req.body.filename) {
      filePath = path.join(BACKUP_DIR, path.basename(req.body.filename));
    }

    if (!filePath) {
      return res.status(400).json({ error: 'filePath or filename is required' });
    }

    const admin = req.admin ? req.admin.username : 'admin';
    const result = await backupManager.restoreBackup(filePath, admin);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export function getRestoreHistory(req, res) {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM restore_history ORDER BY id DESC LIMIT 50').all();
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

