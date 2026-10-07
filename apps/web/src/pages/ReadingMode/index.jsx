import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Fingerprint, CheckCircle2, AlertCircle, Clock, Lock, Sparkles, Building2, User } from 'lucide-react';
import { deviceApi, attendanceApi, staffApi } from '../../services/api';

export default function ReadingMode() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [deviceStatus, setDeviceStatus] = useState(null);
  const [activePunch, setActivePunch] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [enrolledStaff, setEnrolledStaff] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [feedbackTimer, setFeedbackTimer] = useState(null);

  // Live Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Poll device health
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const data = await deviceApi.getStatus();
        setDeviceStatus(data);
      } catch (e) {
        setDeviceStatus({ status: 'NOT CONNECTED' });
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  // Load staff list for simulator punch testing
  useEffect(() => {
    const loadStaff = async () => {
      try {
        const data = await staffApi.getAll({ active: true });
        setEnrolledStaff(data);
        if (data.length > 0) {
          setSelectedStaffId(data[0].staff_id);
        }
      } catch (e) {}
    };
    loadStaff();
  }, []);

  // Handle punch trigger
  const handleTriggerPunch = async (staffIdOverride = null) => {
    const targetStaffId = staffIdOverride || selectedStaffId;
    if (!targetStaffId) return;

    setIsScanning(true);
    try {
      const punchRes = await attendanceApi.punch({
        staff_id: targetStaffId,
        capture_type: deviceStatus?.mode === 'HARDWARE' && deviceStatus?.status === 'READY' ? 'FINGERPRINT' : 'SIMULATOR',
        terminal_id: 'TERM-MAIN-01'
      });

      setActivePunch(punchRes);

      // Auto-clear feedback after 4.5 seconds
      if (feedbackTimer) clearTimeout(feedbackTimer);
      const timer = setTimeout(() => {
        setActivePunch(null);
      }, 4500);
      setFeedbackTimer(timer);
    } catch (err) {
      setActivePunch({
        error: true,
        message: err.response?.data?.error || 'Scan failed or fingerprint not recognized'
      });
      if (feedbackTimer) clearTimeout(feedbackTimer);
      const timer = setTimeout(() => {
        setActivePunch(null);
      }, 4000);
      setFeedbackTimer(timer);
    } finally {
      setIsScanning(false);
    }
  };

  // Determine greeting based on hour
  const hour = currentTime.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 16 ? 'Good Afternoon' : 'Good Evening';

  const isScannerReady = deviceStatus?.status === 'READY';
  const isScannerBusy = deviceStatus?.status === 'SCANNER BUSY';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-6 relative overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-200/40 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header Bar */}
      <header className="flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white text-indigo-600 border border-slate-200 shadow-sm">
            <Fingerprint className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-wider text-slate-900 uppercase">
              College Staff Attendance
            </h1>
            <p className="text-xs text-slate-500 font-medium">Offline-First Biometric Kiosk Terminal</p>
          </div>
        </div>

        {/* Device Status Badge */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm">
          <span className={`w-3 h-3 rounded-full ${
            isScannerReady ? 'bg-emerald-500 animate-pulse' : isScannerBusy ? 'bg-amber-500' : 'bg-rose-500'
          }`} />
          <span className="text-xs font-mono font-semibold tracking-wider text-slate-700">
            {deviceStatus ? `● MFS100 ${deviceStatus.status}` : '● INITIALIZING'}
          </span>
        </div>
      </header>

      {/* Main Center Stage */}
      <main className="flex-1 flex flex-col items-center justify-center my-auto z-10 max-w-xl mx-auto w-full">
        {/* Conditional View: Result Display vs Idle Reading Mode */}
        {activePunch ? (
          activePunch.error ? (
            /* Error Card */
            <div className="w-full bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center shadow-xl animate-in fade-in zoom-in-95 duration-200">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                <AlertCircle className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-rose-900 mb-2">Fingerprint Unrecognized</h2>
              <p className="text-rose-700 text-sm">{activePunch.message}</p>
            </div>
          ) : activePunch.action === 'DUPLICATE_IGNORED' ? (
            /* Duplicate Card */
            <div className="w-full bg-amber-50 border border-amber-200 rounded-3xl p-8 text-center shadow-xl animate-in fade-in zoom-in-95 duration-200">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                <Clock className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-amber-900 mb-2">Already Recorded</h2>
              <p className="text-xl font-medium text-slate-900 mb-1">{activePunch.name}</p>
              <p className="text-sm text-amber-800 font-medium">{activePunch.message}</p>
            </div>
          ) : (
            /* Success Card (Check-in or Check-out) */
            <div className={`w-full rounded-3xl p-8 text-center shadow-xl border animate-in fade-in zoom-in-95 duration-200 ${
              activePunch.action === 'CHECK_IN' 
                ? 'bg-emerald-50/90 border-emerald-200' 
                : 'bg-blue-50/90 border-blue-200'
            }`}>
              <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
                activePunch.action === 'CHECK_IN' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
              }`}>
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
                activePunch.action === 'CHECK_IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {activePunch.action === 'CHECK_IN' ? '✓ CHECK IN RECORDED' : '✓ CHECK OUT RECORDED'}
              </span>

              <h2 className="text-3xl font-extrabold text-slate-900 mt-4 tracking-tight">
                {activePunch.name}
              </h2>
              <p className="text-sm text-slate-600 mt-1 flex items-center justify-center gap-1.5 font-medium">
                <Building2 className="w-4 h-4 text-slate-500" />
                {activePunch.department}
              </p>

              <div className="mt-6 pt-5 border-t border-slate-200/80 grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider block font-medium">Punch Time</span>
                  <span className="text-lg font-mono font-bold text-slate-900">{activePunch.punch_time}</span>
                </div>

                <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider block font-medium">Status</span>
                  <span className={`text-sm font-semibold ${
                    activePunch.late_minutes > 0 
                      ? 'text-amber-700' 
                      : activePunch.early_out_minutes > 0 
                      ? 'text-purple-700' 
                      : 'text-emerald-700'
                  }`}>
                    {activePunch.submessage}
                  </span>
                </div>
              </div>
            </div>
          )
        ) : (
          /* Normal Idle Reading Mode */
          <div className="text-center flex flex-col items-center">
            <span className="text-sm uppercase tracking-widest text-indigo-600 font-bold mb-2">
              {greeting}
            </span>
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-8">
              Place your finger
            </h2>

            {/* Fingerprint Touch Area */}
            <button
              onClick={() => handleTriggerPunch()}
              disabled={isScanning}
              className={`group relative p-10 rounded-full transition-all duration-300 cursor-pointer ${
                isScanning
                  ? 'bg-indigo-50 scale-105 shadow-xl'
                  : 'bg-white hover:bg-slate-50 hover:scale-105 border-2 border-slate-200 hover:border-indigo-500 shadow-xl'
              }`}
            >
              <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all ${
                isScanning ? 'animate-pulse text-indigo-600' : 'text-slate-400 group-hover:text-indigo-600'
              }`}>
                <Fingerprint className="w-24 h-24" />
              </div>

              {/* Pulsing optical scan line */}
              <div className="absolute inset-0 rounded-full border border-indigo-400/30 animate-ping pointer-events-none" />
            </button>

            <p className="mt-8 text-sm text-slate-500 flex items-center gap-2 font-medium">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              {isScanning ? 'Scanning biometric pattern...' : 'Waiting for scan...'}
            </p>

            {/* Scanner Offline Warning */}
            {!isScannerReady && (
              <div className="mt-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 shadow-sm">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                <span className="font-medium">Fingerprint scanner unavailable. Please reconnect the MFS100 device.</span>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer Bar: Clock, Simulator Tools & Admin Login */}
      <footer className="flex flex-col md:flex-row items-center justify-between gap-4 z-10 pt-4 border-t border-slate-200">
        {/* Live Clock */}
        <div className="flex items-center gap-3 text-slate-700">
          <Clock className="w-5 h-5 text-indigo-600" />
          <div className="flex flex-col">
            <span className="font-mono text-sm font-bold tracking-wider text-slate-900">
              {currentTime.toLocaleTimeString('en-US', { hour12: true })}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Quick Simulator Staff Selector for testing without physical MFS100 */}
        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-white border border-slate-200 shadow-xs text-xs">
          <User className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
          <span className="text-slate-600 text-[11px] font-medium">Test Scan:</span>
          <select
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-2 py-1 outline-none focus:border-indigo-600"
          >
            {enrolledStaff.map(s => (
              <option key={s.staff_id} value={s.staff_id}>
                {s.name} ({s.staff_id})
              </option>
            ))}
          </select>
          <button
            onClick={() => handleTriggerPunch(selectedStaffId)}
            disabled={isScanning}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
          >
            Punch
          </button>
        </div>

        {/* Admin Login Link */}
        <Link
          to="/admin/login"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 shadow-xs transition-colors text-xs font-semibold"
        >
          <Lock className="w-3.5 h-3.5 text-indigo-600" />
          Admin Login
        </Link>
      </footer>
    </div>
  );
}
