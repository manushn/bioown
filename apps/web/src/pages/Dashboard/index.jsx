import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  UserCheck, 
  Clock, 
  AlertTriangle, 
  UserX, 
  Activity, 
  Download, 
  PlusCircle, 
  Building2,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { attendanceApi, staffApi, reportsApi } from '../../services/api';
import DeviceCard from '../../components/DeviceCard';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [recentPunches, setRecentPunches] = useState([]);
  const [staffCount, setStaffCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const loadData = async () => {
    try {
      const todayReport = await attendanceApi.getToday();
      setSummary(todayReport.summary);

      const punches = await attendanceApi.getPunches();
      setRecentPunches(punches.slice(0, 8));

      const staff = await staffApi.getAll({ active: true });
      setStaffCount(staff.length);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleExportTodayPdf = async () => {
    try {
      setDownloadingPdf(true);
      await reportsApi.downloadPdf();
    } catch (err) {
      window.open(reportsApi.getPdfDownloadUrl(), '_blank');
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Today's Attendance Overview</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Real-time biometric punch tracking and compliance for {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/staff"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            <PlusCircle className="w-4 h-4 text-indigo-600" />
            Add Staff
          </Link>
          <button
            onClick={handleExportTodayPdf}
            disabled={downloadingPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm shadow-indigo-600/20 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {downloadingPdf ? 'Exporting PDF...' : "Export Today's PDF"}
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Staff</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <span className="text-2xl font-bold text-slate-900">{staffCount}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Present</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-bold text-emerald-700">{summary?.present || 0}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Full Day</span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          </div>
          <span className="text-2xl font-bold text-blue-700">{summary?.fullDay || 0}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Half Day</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <span className="text-2xl font-bold text-amber-700">{summary?.halfDay || 0}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Late In</span>
            <Clock className="w-4 h-4 text-orange-600" />
          </div>
          <span className="text-2xl font-bold text-orange-700">{summary?.late || 0}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Early Out</span>
            <AlertTriangle className="w-4 h-4 text-purple-600" />
          </div>
          <span className="text-2xl font-bold text-purple-700">{summary?.earlyOut || 0}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Absent</span>
            <UserX className="w-4 h-4 text-rose-600" />
          </div>
          <span className="text-2xl font-bold text-rose-700">{summary?.absent || 0}</span>
        </div>
      </div>

      {/* Main Grid: Device Health Card & Live Punches Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: MFS100 Status Card & System shortcuts */}
        <div className="space-y-6">
          <DeviceCard />

          {/* Quick Admin Actions */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Quick Navigation</h3>
            <div className="space-y-2">
              <Link
                to="/admin/attendance"
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs text-slate-700 hover:text-slate-900 transition-colors border border-slate-200/80"
              >
                <span>View Attendance Log & Overrides</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
              <Link
                to="/admin/reports"
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs text-slate-700 hover:text-slate-900 transition-colors border border-slate-200/80"
              >
                <span>Generate Date-wise Reports</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
              <Link
                to="/admin/backup"
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs text-slate-700 hover:text-slate-900 transition-colors border border-slate-200/80"
              >
                <span>Create Database Backup</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
              <Link
                to="/admin/settings"
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs text-slate-700 hover:text-slate-900 transition-colors border border-slate-200/80"
              >
                <span>Adjust Timings & Late Compensation</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>
          </div>
        </div>

        {/* Right column: Recent Punches Feed */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">Today's Biometric Punch Feed</h3>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">Auto-updating</span>
            </div>

            {recentPunches.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No punches recorded yet today. Staff punches will appear here in real-time.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentPunches.map((punch) => (
                  <div key={punch.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-[10px] text-indigo-700">
                        {punch.staff_id}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">{punch.name}</h4>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                          <Building2 className="w-3 h-3" />
                          {punch.department}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-bold text-slate-900 block">{punch.punch_time}</span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">{punch.capture_type}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 text-right">
            <Link to="/admin/attendance" className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold">
              View all punches &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
