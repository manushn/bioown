import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import * as authController from '../controllers/authController.js';
import * as deviceController from '../controllers/deviceController.js';
import * as attendanceController from '../controllers/attendanceController.js';
import * as staffController from '../controllers/staffController.js';
import * as rulesController from '../controllers/rulesController.js';
import * as reportsController from '../controllers/reportsController.js';
import * as backupController from '../controllers/backupController.js';
import * as auditController from '../controllers/auditController.js';

const router = Router();

// ================= AUTHENTICATION =================
router.post('/auth/login', authController.login);
router.post('/auth/reset-password', authController.resetPassword);
router.get('/auth/me', requireAdmin, authController.getCurrentAdmin);
router.post('/auth/change-password', requireAdmin, authController.changePassword);

// ================= DEVICE / MFS100 =================
router.get('/device/status', deviceController.getStatus);
router.post('/device/reconnect', deviceController.reconnect);
router.post('/device/test', deviceController.testDevice);
router.post('/device/capture', deviceController.capture);
router.post('/device/identify', deviceController.identify);
router.post('/device/simulator-toggle', deviceController.setSimulator);

// ================= ATTENDANCE & PUNCHES =================
// Public punch endpoint for staff kiosk
router.post('/attendance/punch', attendanceController.punch);
router.get('/attendance/today', attendanceController.getToday);

// Protected attendance endpoints
router.get('/attendance', requireAdmin, attendanceController.getAttendance);
router.get('/attendance/:staffId', requireAdmin, attendanceController.getStaffAttendance);
router.get('/punches', requireAdmin, attendanceController.getPunches);
router.post('/attendance/override', requireAdmin, attendanceController.setOverride);
router.get('/attendance/overrides', requireAdmin, attendanceController.getOverrides);

// ================= STAFF MANAGEMENT =================
router.get('/staff', requireAdmin, staffController.getAllStaff);
router.post('/staff', requireAdmin, staffController.createStaff);
router.get('/staff/:id', requireAdmin, staffController.getStaffById);
router.put('/staff/:id', requireAdmin, staffController.updateStaff);
router.delete('/staff/:id', requireAdmin, staffController.deleteStaff);
router.post('/staff/:id/fingerprint', requireAdmin, staffController.enrollFingerprint);
router.delete('/staff/:id/fingerprint/:fingerIndex', requireAdmin, staffController.removeFingerprint);

// ================= ATTENDANCE RULES =================
router.get('/rules', requireAdmin, rulesController.getRules);
router.put('/rules', requireAdmin, rulesController.updateRules);
router.put('/rules/:id', requireAdmin, rulesController.updateRules);

// ================= REPORTS & PDF =================
router.get('/reports/attendance', requireAdmin, reportsController.getAttendanceReportData);
router.get('/reports/attendance.pdf', requireAdmin, reportsController.downloadAttendancePdf);

// ================= BACKUP & RESTORE =================
router.post('/backup/create', requireAdmin, backupController.createBackup);
router.get('/backup/list', requireAdmin, backupController.listBackups);
router.get('/backup/:filename/download', requireAdmin, backupController.downloadBackup);
router.post('/backup/validate', requireAdmin, backupController.validateBackup);
router.post('/backup/restore', requireAdmin, backupController.restoreBackup);
router.get('/backup/restore-history', requireAdmin, backupController.getRestoreHistory);

// ================= AUDIT LOGS =================
router.get('/audit', requireAdmin, auditController.getAuditLogs);

export default router;

