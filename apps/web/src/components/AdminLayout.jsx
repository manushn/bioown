import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  FileText, 
  Settings, 
  Database, 
  Cpu, 
  ShieldAlert, 
  LogOut, 
  Monitor, 
  Fingerprint,
  ChevronRight
} from 'lucide-react';
import { authApi, deviceApi } from '../services/api';

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [deviceStatus, setDeviceStatus] = useState(null);
  const user = authApi.getStoredUser();

  useEffect(() => {
    // Check auth
    if (!localStorage.getItem('admin_token')) {
      navigate('/admin/login');
      return;
    }

    const checkDevice = async () => {
      try {
        const data = await deviceApi.getStatus();
        setDeviceStatus(data);
      } catch (e) {
        setDeviceStatus({ status: 'NOT CONNECTED' });
      }
    };
    checkDevice();
    const interval = setInterval(checkDevice, 6000);
    return () => clearInterval(interval);
  }, [navigate]);

  const handleLogout = () => {
    authApi.logout();
    navigate('/admin/login');
  };

  const navItems = [
    { label: 'Overview', path: '/admin', icon: LayoutDashboard },
    { label: 'Staff Management', path: '/admin/staff', icon: Users },
    { label: 'Attendance Records', path: '/admin/attendance', icon: CalendarCheck },
    { label: 'Reports & PDF', path: '/admin/reports', icon: FileText },
    { label: 'Timing & Rules', path: '/admin/settings', icon: Settings },
    { label: 'Backup & Restore', path: '/admin/backup', icon: Database },
    { label: 'MFS100 Hardware', path: '/admin/device', icon: Cpu },
    { label: 'Security & Audit', path: '/admin/audit', icon: ShieldAlert },
  ];

  const isReady = deviceStatus?.status === 'READY';
  const isBusy = deviceStatus?.status === 'SCANNER BUSY';

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between select-none shadow-sm z-20">
        <div>
          {/* Header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <Fingerprint className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-sm tracking-tight text-slate-900 leading-tight">NICETECH</h1>
                <p className="text-[10px] text-slate-500 font-medium">Biometric Attendance</p>
              </div>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="p-3 space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive 
                      ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs border-r-2 border-indigo-600' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-600" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer controls */}
        <div className="p-4 border-t border-slate-100 space-y-2.5">
          {/* Kiosk Mode Jump */}
          <Link
            to="/"
            className="flex items-center justify-center gap-2 w-full py-2 px-3 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 border border-emerald-200 transition-colors"
          >
            <Monitor className="w-3.5 h-3.5 text-emerald-600" />
            Switch to Reading Mode
          </Link>

          {/* User profile & Logout */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-900">{user?.username || 'niadmin'}</span>
              <span className="text-[10px] text-slate-500">System Admin</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Admin Dashboard</span>
            <span>/</span>
            <span className="text-slate-800 font-medium">
              {navItems.find(i => i.path === location.pathname)?.label || 'Overview'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Live Device Status Pill */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs">
              <span className={`w-2 h-2 rounded-full ${
                isReady ? 'bg-emerald-500 animate-pulse' : isBusy ? 'bg-amber-500' : 'bg-rose-500'
              }`} />
              <span className="text-slate-600 font-mono text-[11px]">
                MFS100: <strong className={isReady ? 'text-emerald-700' : isBusy ? 'text-amber-700' : 'text-rose-600'}>
                  {deviceStatus?.status || 'CHECKING'}
                </strong>
              </span>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
