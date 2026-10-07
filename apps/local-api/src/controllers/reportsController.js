import { generateAttendanceReport } from '../attendance/engine.js';
import { createAttendancePdfStream } from '../reports/pdfGenerator.js';

export function getAttendanceReportData(req, res) {
  try {
    const fromDate = req.query.fromDate || new Date().toISOString().split('T')[0];
    const toDate = req.query.toDate || fromDate;
    const department = req.query.department || 'All';
    const staffId = req.query.staffId || 'All';
    const statusFilter = req.query.status || 'All';

    const report = generateAttendanceReport({
      fromDate,
      toDate,
      department,
      staffId,
      statusFilter
    });

    return res.json(report);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export function downloadAttendancePdf(req, res) {
  try {
    const fromDate = req.query.fromDate || new Date().toISOString().split('T')[0];
    const toDate = req.query.toDate || fromDate;
    const department = req.query.department || 'All';
    const staffId = req.query.staffId || 'All';
    const statusFilter = req.query.status || 'All';

    const report = generateAttendanceReport({
      fromDate,
      toDate,
      department,
      staffId,
      statusFilter
    });

    createAttendancePdfStream(report, res);
  } catch (err) {
    console.error('Error generating PDF:', err);
    return res.status(500).json({ error: err.message });
  }
}

