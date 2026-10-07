import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

let PDFDocument = null;
try {
  PDFDocument = require('pdfkit');
} catch (e) {
  PDFDocument = null;
}

/**
 * Generate attendance PDF document stream
 */
export function createAttendancePdfStream(reportData, res) {
  if (!PDFDocument) {
    // If PDFKit is not yet available, return a formatted text representation
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance-report.txt"');
    
    let text = `COLLEGE STAFF ATTENDANCE REPORT\n`;
    text += `==============================================\n`;
    text += `Generated At: ${new Date().toLocaleString()}\n`;
    text += `Summary: Total Records: ${reportData.summary.totalRecords}, Present: ${reportData.summary.present}, Absent: ${reportData.summary.absent}, Late: ${reportData.summary.late}\n\n`;
    text += `Date | Staff ID | Name | Department | In Time | Out Time | Status | Late | Early Out\n`;
    text += `--------------------------------------------------------------------------------------\n`;
    
    for (const r of reportData.records) {
      text += `${r.attendance_date} | ${r.staff_id} | ${r.name} | ${r.department} | ${r.in_time || '--'} | ${r.out_time || '--'} | ${r.status} | ${r.late_minutes}m | ${r.early_out_minutes}m\n`;
    }
    res.send(text);
    return;
  }

  const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="attendance-report.pdf"');
  doc.pipe(res);

  // Header Banner
  doc.rect(0, 0, 842, 60).fill('#1e3a8a');
  doc.fillColor('#ffffff').fontSize(18).text('COLLEGE STAFF BIOMETRIC ATTENDANCE REPORT', 35, 18, { align: 'left' });
  doc.fontSize(10).text(`Generated: ${new Date().toLocaleString('en-IN')}`, 35, 40, { align: 'left' });

  doc.moveDown(2);
  doc.fillColor('#1f2937').fontSize(11);

  // Summary Metrics Bar
  const { summary } = reportData;
  const metricsY = 75;
  const cardWidth = 100;
  const metrics = [
    { label: 'Total Records', val: summary.totalRecords, color: '#f3f4f6', textCol: '#111827' },
    { label: 'Present', val: summary.present, color: '#dcfce7', textCol: '#166534' },
    { label: 'Full Day', val: summary.fullDay, color: '#dbeafe', textCol: '#1e40af' },
    { label: 'Half Day', val: summary.halfDay, color: '#fef3c7', textCol: '#92400e' },
    { label: 'Absent', val: summary.absent, color: '#fee2e2', textCol: '#991b1b' },
    { label: 'Late In', val: summary.late, color: '#ffedd5', textCol: '#9a3412' },
    { label: 'Early Out', val: summary.earlyOut, color: '#f3e8ff', textCol: '#6b21a8' }
  ];

  metrics.forEach((m, idx) => {
    const x = 35 + idx * (cardWidth + 10);
    doc.roundedRect(x, metricsY, cardWidth, 42, 4).fill(m.color);
    doc.fillColor(m.textCol).fontSize(8).text(m.label, x + 5, metricsY + 6, { width: cardWidth - 10, align: 'center' });
    doc.fontSize(13).text(String(m.val), x + 5, metricsY + 20, { width: cardWidth - 10, align: 'center' });
  });

  // Table header
  let y = 135;
  doc.rect(35, y, 772, 22).fill('#374151');
  doc.fillColor('#ffffff').fontSize(9);

  const cols = [
    { name: 'Date', x: 40, w: 65 },
    { name: 'Staff ID', x: 110, w: 60 },
    { name: 'Staff Name', x: 175, w: 120 },
    { name: 'Department', x: 300, w: 130 },
    { name: 'In Time', x: 435, w: 55 },
    { name: 'Out Time', x: 495, w: 55 },
    { name: 'Duration', x: 555, w: 60 },
    { name: 'Status', x: 620, w: 75 },
    { name: 'Late', x: 700, w: 45 },
    { name: 'Early', x: 750, w: 50 }
  ];

  cols.forEach(col => {
    doc.text(col.name, col.x, y + 6);
  });

  y += 24;
  doc.fillColor('#1f2937').fontSize(8);

  // Table rows
  reportData.records.forEach((r, idx) => {
    if (y > 540) {
      doc.addPage({ margin: 30, size: 'A4', layout: 'landscape' });
      y = 40;
      doc.rect(35, y, 772, 22).fill('#374151');
      doc.fillColor('#ffffff').fontSize(9);
      cols.forEach(col => doc.text(col.name, col.x, y + 6));
      y += 24;
      doc.fillColor('#1f2937').fontSize(8);
    }

    const rowBg = idx % 2 === 0 ? '#f9fafb' : '#ffffff';
    doc.rect(35, y - 2, 772, 18).fill(rowBg);

    doc.fillColor('#374151');
    doc.text(r.attendance_date || '--', cols[0].x, y + 2);
    doc.text(r.staff_id || '--', cols[1].x, y + 2);
    doc.text(r.name || '--', cols[2].x, y + 2);
    doc.text((r.department || '--').substring(0, 24), cols[3].x, y + 2);
    doc.text(r.in_time ? r.in_time.substring(0, 5) : '--', cols[4].x, y + 2);
    doc.text(r.out_time ? r.out_time.substring(0, 5) : '--', cols[5].x, y + 2);
    doc.text(r.working_duration || '0m', cols[6].x, y + 2);

    // Status colored text
    if (r.status === 'FULL DAY' || r.status === 'PRESENT') doc.fillColor('#15803d');
    else if (r.status === 'HALF DAY') doc.fillColor('#b45309');
    else if (r.status === 'CHECKED_IN') doc.fillColor('#1d4ed8');
    else doc.fillColor('#b91c1c');

    doc.text(r.status || 'ABSENT', cols[7].x, y + 2);

    doc.fillColor(r.late_minutes > 0 ? '#c2410c' : '#6b7280');
    doc.text(r.late_minutes > 0 ? `${r.late_minutes}m` : '--', cols[8].x, y + 2);

    doc.fillColor(r.early_out_minutes > 0 ? '#7e22ce' : '#6b7280');
    doc.text(r.early_out_minutes > 0 ? `${r.early_out_minutes}m` : '--', cols[9].x, y + 2);

    y += 18;
  });

  // Footer
  doc.fontSize(8).fillColor('#9ca3af').text(
    'College Staff Fingerprint Attendance System — Offline-First SQLite Terminal Report',
    35,
    565,
    { align: 'center', width: 772 }
  );

  doc.end();
}

