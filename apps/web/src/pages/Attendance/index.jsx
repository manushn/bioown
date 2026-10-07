import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Search, 
  Filter, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Edit3, 
  CheckCircle, 
  AlertCircle, 
  User, 
  Building2,
  RefreshCw
} from 'lucide-react';
import { attendanceApi, staffApi } from '../../services/api';

export default function AttendancePage() {
  const todayStr = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [department, setDepartment] = useState('All');
  const [staffId, setStaffId] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const [reportData, setReportData] = useState(null);
  const [staffOptions, setStaffOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Override Modal
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideTarget, setOverrideTarget] = useState(null);
  const [overrideStatus, setOverrideStatus] = useState('FULL DAY');
  const [overrideReason, setOverrideReason] = useState('Official Duty / College Permission');
  const [overrideMessage, setOverrideMessage] = useState('');

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const staff = await staffApi.getAll({ active: true });
        setStaffOptions(staff);
      } catch (e) {}
    };
    fetchStaff();
  }, []);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const data = await attendanceApi.getAttendance({
        fromDate,
        toDate,
        department,
        staffId,
        status: statusFilter
      });
      setReportData(data);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [fromDate, toDate, department, staffId, statusFilter]);

  const toggleExpand = (key) => {
    const next = new Set(expandedRows);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpandedRows(next);
  };

  const openOverrideModal = (record) => {
    setOverrideTarget(record);
    setOverrideStatus(record.status === 'ABSENT' || record.status === 'HALF DAY' ? 'FULL DAY' : 'HALF DAY');
    setOverrideReason('Official Duty / Permission Granted');
    setOverrideMessage('');
    setShowOverrideModal(true);
  };

  const handleSaveOverride = async (e) => {
    e.preventDefault();
    if (!overrideTarget) return;

    try {
      await attendanceApi.setOverride({
        staff_id: overrideTarget.staff_id,
        attendance_date: overrideTarget.attendance_date,
        override_status: overrideStatus,
        reason: overrideReason
      });

      setShowOverrideModal(false);
      fetchAttendance();
    } catch (err) {
      setOverrideMessage(err.response?.data?.error || 'Failed to save override');
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Attendance Records & Timelines</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Merged view combining biometric punches, college schedule rules, and administrator adjustments
          </p>
        </div>

        <button
          onClick={fetchAttendance}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition-colors self-start md:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* From Date */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-medium"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-medium"
            />
          </div>

          {/* Department */}
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

          {/* Staff ID */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Staff Member</label>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-medium"
            >
              <option value="All">All Staff</option>
              {staffOptions.map(s => (
                <option key={s.staff_id} value={s.staff_id}>
                  {s.name} ({s.staff_id})
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Status Filter</label>
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
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
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
                <th className="py-3 px-4">Working Time</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!reportData || reportData.records.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400">
                    {loading ? 'Calculating attendance reports...' : 'No attendance records match the selected criteria.'}
                  </td>
                </tr>
              ) : (
                reportData.records.map((r) => {
                  const rowKey = `${r.staff_id}_${r.attendance_date}`;
                  const isExpanded = expandedRows.has(rowKey);

                  return (
                    <React.Fragment key={rowKey}>
                      <tr className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-500">
                          {r.attendance_date}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                          {r.staff_id}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {r.name}
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-[11px] font-medium">
                          {r.department}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {r.in_time ? (
                            <span className={r.late_minutes > 0 ? 'text-amber-700 font-bold' : 'text-slate-800'}>
                              {r.in_time.substring(0, 5)}
                              {r.late_minutes > 0 && <span className="text-[10px] ml-1">({r.late_minutes}m late)</span>}
                            </span>
                          ) : (
                            <span className="text-slate-400">--</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {r.out_time ? (
                            <span className={r.early_out_minutes > 0 ? 'text-purple-700 font-bold' : 'text-slate-800'}>
                              {r.out_time.substring(0, 5)}
                              {r.early_out_minutes > 0 && <span className="text-[10px] ml-1">({r.early_out_minutes}m early)</span>}
                            </span>
                          ) : (
                            <span className="text-slate-400">--</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700 font-medium">
                          {r.working_duration || '0m'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              r.status === 'FULL DAY' || r.status === 'PRESENT'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : r.status === 'HALF DAY'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : r.status === 'CHECKED_IN'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {r.status}
                            </span>
                            {r.is_override && (
                              <span className="text-[9px] text-amber-600 font-bold">
                                ★ Overridden
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => toggleExpand(rowKey)}
                              title="Expand Punch Timeline"
                              className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => openOverrideModal(r)}
                              title="Admin Override Status"
                              className="p-1 rounded bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Punch Timeline Sub-Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80 border-b border-slate-100">
                          <td colSpan="9" className="p-4 pl-12">
                            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                              <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                                Chronological Punch Timeline for {r.name} ({r.attendance_date}):
                              </h4>

                              {r.punches.length === 0 ? (
                                <p className="text-slate-400 text-xs italic">No raw punches recorded on this date.</p>
                              ) : (
                                <div className="flex flex-wrap gap-2.5">
                                  {r.punches.map((p, idx) => (
                                    <div key={p.id || idx} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs">
                                      <span className="text-slate-500 text-[10px] block font-medium">Punch #{idx + 1}</span>
                                      <span className="font-mono font-bold text-slate-900 text-sm">{p.time}</span>
                                      <span className="text-[10px] text-indigo-600 block mt-0.5 font-medium">{p.type} • {p.terminal}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {r.is_override && (
                                <div className="mt-3 p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                                  <strong>Admin Override:</strong> Status forced to <strong>{r.status}</strong> by admin <em>{r.override_admin}</em>. Reason: "{r.override_reason}"
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Admin Override */}
      {showOverrideModal && overrideTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-800">
            <h3 className="font-bold text-slate-900 text-base mb-1">ADMIN ATTENDANCE OVERRIDE</h3>
            <p className="text-xs text-slate-500 mb-4">
              Modify system calculation for <strong>{overrideTarget.name}</strong> on {overrideTarget.attendance_date}.
            </p>

            {overrideMessage && (
              <div className="mb-3 p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {overrideMessage}
              </div>
            )}

            <form onSubmit={handleSaveOverride} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Current Calculated Status</label>
                <input
                  type="text"
                  value={overrideTarget.status}
                  disabled
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Override Status *</label>
                <select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium"
                >
                  <option value="FULL DAY">FULL DAY</option>
                  <option value="HALF DAY">HALF DAY</option>
                  <option value="PRESENT">PRESENT</option>
                  <option value="ABSENT">ABSENT</option>
                  <option value="ON DUTY">ON DUTY (EXCUSED)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Official Reason *</label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  required
                  rows={3}
                  placeholder="e.g. Official University Examination Duty, Special Permission"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold"
                >
                  Save Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
