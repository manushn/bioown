import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Search, 
  Calendar, 
  Building2, 
  User, 
  CheckCircle2, 
  Clock, 
  AlertTriangle 
} from 'lucide-react';
import { reportsApi, staffApi } from '../../services/api';

export default function ReportsPage() {
  const todayStr = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [department, setDepartment] = useState('All');
  const [staffId, setStaffId] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const [reportData, setReportData] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const staff = await staffApi.getAll({ active: true });
        setStaffList(staff);
      } catch (e) {}
    };
    fetchStaff();
  }, []);

  const handleGenerateReport = async (e) => {
    if (e) e.preventDefault();
    try {
      setLoading(true);
      const data = await reportsApi.getReportData({
        fromDate,
        toDate,
        department,
        staffId,
        status: statusFilter
      });
      setReportData(data);
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleGenerateReport();
  }, [fromDate, toDate, department, staffId, statusFilter]);

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      await reportsApi.downloadPdf({
        fromDate,
        toDate,
        department,
        staffId,
        status: statusFilter
      });
    } catch (err) {
      // Fallback with token
      const url = reportsApi.getPdfDownloadUrl({
        fromDate,
        toDate,
        department,
        staffId,
        status: statusFilter
      });
      window.open(url, '_blank');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const departments = [
    'All',
    'Computer Science & Engineering',
    'Information Technology',
    'Electronics & Communication',
    'Mechanical Engineering',
    'Civil Engineering',
    'Administration'
  ];

  return (
    <div className="space-y-6 text-slate-800">
      {/* Header and Download Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Official Attendance Reports</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Generate and export institutional date-wise attendance records as official PDF documents
          </p>
        </div>

        <button
          onClick={handleDownloadPdf}
          disabled={downloadingPdf}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm shadow-indigo-600/20 transition-colors self-start md:self-auto cursor-pointer disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {downloadingPdf ? 'Exporting PDF...' : 'Download Report PDF'}
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <form onSubmit={handleGenerateReport} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block text-slate-600 font-semibold mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-medium"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-medium"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Department</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-medium"
            >
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Staff Member</label>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-medium"
            >
              <option value="All">All Staff</option>
              {staffList.map(s => (
                <option key={s.staff_id} value={s.staff_id}>
                  {s.name} ({s.staff_id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-medium"
            >
              <option value="All">All Statuses</option>
              <option value="PRESENT">Present</option>
              <option value="FULL DAY">Full Day</option>
              <option value="HALF DAY">Half Day</option>
              <option value="ABSENT">Absent</option>
              <option value="LATE">Late In</option>
              <option value="EARLY_OUT">Early Out</option>
            </select>
          </div>
        </form>
      </div>

      {/* Summary Cards */}
      {reportData && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Total Records</span>
            <span className="text-xl font-bold text-slate-900">{reportData.summary.totalRecords}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Present</span>
            <span className="text-xl font-bold text-emerald-700">{reportData.summary.present}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Full Day</span>
            <span className="text-xl font-bold text-blue-700">{reportData.summary.fullDay}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Half Day</span>
            <span className="text-xl font-bold text-amber-700">{reportData.summary.halfDay}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Absent</span>
            <span className="text-xl font-bold text-rose-700">{reportData.summary.absent}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Late In</span>
            <span className="text-xl font-bold text-orange-700">{reportData.summary.late}</span>
          </div>
        </div>
      )}

      {/* Preview Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Report Preview</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {reportData ? `${reportData.records.length} records found` : 'Loading...'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Staff ID</th>
                <th className="py-3 px-4">Staff Name</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">In Time</th>
                <th className="py-3 px-4">Out Time</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Late / Early</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!reportData || reportData.records.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400">
                    {loading ? 'Generating report preview...' : 'No records match filter criteria.'}
                  </td>
                </tr>
              ) : (
                reportData.records.map((r, idx) => (
                  <tr key={`${r.staff_id}_${r.attendance_date}_${idx}`} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono text-slate-500">{r.attendance_date}</td>
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">{r.staff_id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{r.name}</td>
                    <td className="py-3 px-4 text-slate-600 text-[11px] font-medium">{r.department}</td>
                    <td className="py-3 px-4 font-mono">{r.in_time ? r.in_time.substring(0, 5) : '--'}</td>
                    <td className="py-3 px-4 font-mono">{r.out_time ? r.out_time.substring(0, 5) : '--'}</td>
                    <td className="py-3 px-4 font-mono text-slate-700 font-medium">{r.working_duration || '0m'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        r.status === 'FULL DAY' || r.status === 'PRESENT'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : r.status === 'HALF DAY'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[11px]">
                      {r.late_minutes > 0 && <span className="text-orange-700 font-bold">+{r.late_minutes}m Late </span>}
                      {r.early_out_minutes > 0 && <span className="text-purple-700 font-bold">-{r.early_out_minutes}m Early</span>}
                      {!r.late_minutes && !r.early_out_minutes && <span className="text-slate-400">--</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
