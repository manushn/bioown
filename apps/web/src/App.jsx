import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ReadingMode from './pages/ReadingMode';
import Login from './pages/Login';
import AdminLayout from './components/AdminLayout';
import Dashboard from './pages/Dashboard';
import StaffPage from './pages/Staff';
import AttendancePage from './pages/Attendance';
import ReportsPage from './pages/Reports';
import SettingsPage from './pages/Settings';
import BackupPage from './pages/Backup';
import DevicePage from './pages/Device';
import AuditPage from './pages/Audit';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Kiosk Attendance Reading Mode - Default entry screen */}
        <Route path="/" element={<ReadingMode />} />

        {/* Admin Login */}
        <Route path="/admin/login" element={<Login />} />

        {/* Protected Admin Control Panel */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="backup" element={<BackupPage />} />
          <Route path="device" element={<DevicePage />} />
          <Route path="audit" element={<AuditPage />} />
        </Route>

        {/* Catch-all redirect to Reading Mode */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

