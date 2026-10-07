import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, User, KeyRound, ShieldCheck, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { authApi } from '../../services/api';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('niadmin');
  const [password, setPassword] = useState('ni2027');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Password reset modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUsername, setResetUsername] = useState('niadmin');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  // Change password modal (for first-time login)
  const [showMustChangeModal, setShowMustChangeModal] = useState(false);
  const [changeCurrentPassword, setChangeCurrentPassword] = useState('');
  const [changeNewPassword, setChangeNewPassword] = useState('');
  const [changeConfirmPassword, setChangeConfirmPassword] = useState('');
  const [changeError, setChangeError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await authApi.login(username, password);
      if (data.admin?.mustChangePassword) {
        setChangeCurrentPassword(password);
        setShowMustChangeModal(true);
      } else {
        navigate('/admin');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const handleFirstTimeChangePassword = async (e) => {
    e.preventDefault();
    setChangeError('');

    if (changeNewPassword.length < 8) {
      setChangeError('New password must be at least 8 characters long');
      return;
    }
    if (changeNewPassword !== changeConfirmPassword) {
      setChangeError('Passwords do not match');
      return;
    }

    try {
      await authApi.changePassword(changeCurrentPassword, changeNewPassword);
      setShowMustChangeModal(false);
      navigate('/admin');
    } catch (err) {
      setChangeError(err.response?.data?.error || 'Failed to update password');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetMessage('');

    if (newResetPassword.length < 8) {
      setResetMessage('New password must be at least 8 characters');
      return;
    }

    try {
      await authApi.resetPassword(resetUsername, recoveryKey, newResetPassword);
      setResetMessage('Password reset successfully. You can now login with your new password.');
      setPassword(newResetPassword);
      setTimeout(() => setShowResetModal(false), 2000);
    } catch (err) {
      setResetMessage('Reset failed: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-100/60 rounded-full blur-[130px] pointer-events-none" />

      {/* Back to reading mode link */}
      <Link
        to="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Reading Mode
      </Link>

      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-xl z-10 text-slate-800">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 uppercase">NICETECH ATTENDANCE</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">Administrator Control Panel</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors"
                placeholder="Enter admin username"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-9 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors"
                placeholder="Enter admin password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span className="text-[11px] font-medium">Default: niadmin / ni2027</span>
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="text-indigo-600 hover:text-indigo-700 text-xs font-semibold hover:underline cursor-pointer"
            >
              Reset Password
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs tracking-wide transition-colors shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'LOGIN TO DASHBOARD'}
          </button>
        </form>
      </div>

      {/* Modal: First-Time Login Password Change */}
      {showMustChangeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">SECURITY SETUP REQUIRED</h3>
                <p className="text-xs text-slate-500">You are using the default administrator password.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
              For security, you must set a new strong administrator password before continuing. Minimum 8 characters.
            </p>

            {changeError && (
              <div className="mb-4 p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {changeError}
              </div>
            )}

            <form onSubmit={handleFirstTimeChangePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={changeNewPassword}
                  onChange={(e) => setChangeNewPassword(e.target.value)}
                  required
                  placeholder="At least 8 characters"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={changeConfirmPassword}
                  onChange={(e) => setChangeConfirmPassword(e.target.value)}
                  required
                  placeholder="Re-enter new password"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  SAVE & CONTINUE TO DASHBOARD
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Recovery Key Reset Password */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-800">
            <h3 className="font-bold text-slate-900 text-sm mb-1">ADMIN PASSWORD RESET</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter your admin username and recovery key from <code className="text-indigo-600 font-mono">config/security.json</code>.
            </p>

            {resetMessage && (
              <div className="mb-3 p-2.5 rounded bg-slate-50 border border-slate-200 text-xs text-slate-700">
                {resetMessage}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Username</label>
                <input
                  type="text"
                  value={resetUsername}
                  onChange={(e) => setResetUsername(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Recovery Key</label>
                <input
                  type="password"
                  value={recoveryKey}
                  onChange={(e) => setRecoveryKey(e.target.value)}
                  required
                  placeholder="e.g. RECOVERY-NICETECH-2027-KEY-SECURE"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Password (8+ chars)</label>
                <input
                  type="password"
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
