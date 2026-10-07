import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  RotateCcw, 
  FileText, 
  RefreshCw 
} from 'lucide-react';
import { backupApi } from '../../services/api';

export default function BackupPage() {
  const [backups, setBackups] = useState([]);
  const [restoreHistory, setRestoreHistory] = useState([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [validationResult, setValidationResult] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showConfirmRestore, setShowConfirmRestore] = useState(false);

  const loadData = async () => {
    try {
      const data = await backupApi.list();
      setBackups(data.history || []);
      const history = await backupApi.getRestoreHistory();
      setRestoreHistory(history || []);
    } catch (err) {
      console.error('Error fetching backups:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateBackup = async () => {
    setActionLoading(true);
    setMessage('');
    setError('');
    try {
      const res = await backupApi.create();
      setMessage(`✓ Backup created successfully: ${res.filename}`);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create backup');
    } finally {
      setActionLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!selectedFile) {
      setError('Please select or specify a backup filename first');
      return;
    }
    setActionLoading(true);
    setError('');
    try {
      const res = await backupApi.validate({ filename: selectedFile });
      setValidationResult(res);
      if (!res.valid) {
        setError(`Validation warning: ${res.message}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Validation error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleProceedRestore = async () => {
    setActionLoading(true);
    setMessage('');
    setError('');
    try {
      const res = await backupApi.restore({ filename: selectedFile });
      setMessage(`✓ Database restored successfully! Safety rollback snapshot saved as: ${res.safetyBackup}`);
      setShowConfirmRestore(false);
      setValidationResult(null);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Restoration failed');
    } finally {
      setActionLoading(false);
    }
  };

  const latestBackup = backups[0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-slate-800">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Database Backup & Disaster Recovery</h2>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Manage local SQLite snapshots, create verified exports, and restore records with automated safety rollbacks
        </p>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Database Status & Quick Backup Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-bold uppercase tracking-wider">Database Status</span>
              <Database className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-lg font-bold text-slate-900">SQLite Healthy</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Local terminal source of truth</p>
          </div>

          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
            Last Backup:{' '}
            <strong className="text-slate-800">
              {latestBackup ? new Date(latestBackup.created_at).toLocaleString() : 'None yet'}
            </strong>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2">Create New Snapshot</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Creates a point-in-time verified snapshot including all staff profiles, biometrics, rules, and raw punch records.
            </p>
          </div>

          <button
            onClick={handleCreateBackup}
            disabled={actionLoading}
            className="w-full mt-4 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm shadow-indigo-600/20 disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            Create Database Backup
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2">Download Latest Backup</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Save the latest backup file to an external USB drive, network share, or secondary Windows attendance terminal.
            </p>
          </div>

          {latestBackup ? (
            <a
              href={backupApi.getDownloadUrl(latestBackup.filename)}
              download
              className="w-full mt-4 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors text-center"
            >
              <Download className="w-4 h-4 text-indigo-600" />
              Download Latest (.db)
            </a>
          ) : (
            <button disabled className="w-full mt-4 py-2.5 px-3 bg-slate-50 text-slate-400 rounded-lg text-xs font-semibold cursor-not-allowed">
              No Backups Available
            </button>
          )}
        </div>
      </div>

      {/* Restore Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <RotateCcw className="w-4 h-4 text-indigo-600" />
          <h3 className="font-bold text-slate-900 text-sm">Restore Database</h3>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed font-medium">
          Select an existing backup file to validate and restore. Before restoring, the system will automatically create a mandatory safety backup (<code>pre-restore-backup-*.db</code>) ensuring no punch history is lost.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedFile}
            onChange={(e) => {
              setSelectedFile(e.target.value);
              setValidationResult(null);
            }}
            className="flex-1 bg-slate-50 border border-slate-300 text-xs text-slate-900 rounded-lg px-3 py-2 font-medium"
          >
            <option value="">-- Choose Backup to Restore --</option>
            {backups.map(b => (
              <option key={b.filename} value={b.filename}>
                {b.filename} ({Math.round(b.size_bytes / 1024)} KB) — {new Date(b.created_at).toLocaleDateString()}
              </option>
            ))}
          </select>

          <button
            onClick={handleValidate}
            disabled={!selectedFile || actionLoading}
            className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          >
            Validate File
          </button>

          <button
            onClick={() => setShowConfirmRestore(true)}
            disabled={!selectedFile || (validationResult && !validationResult.valid) || actionLoading}
            className="py-2 px-5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          >
            Restore Backup
          </button>
        </div>

        {/* Validation Details */}
        {validationResult && (
          <div className={`p-4 rounded-xl border text-xs ${
            validationResult.valid 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <h4 className="font-bold mb-1">
              {validationResult.valid ? '✓ Backup Integrity Verified' : '⚠ Validation Issues Found'}
            </h4>
            <p>{validationResult.message}</p>
            {validationResult.valid && (
              <div className="mt-2 text-[11px] text-slate-700 grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-emerald-200 font-medium">
                <span>Staff Records: <strong>{validationResult.staffCount}</strong></span>
                <span>Punch Records: <strong>{validationResult.punchesCount}</strong></span>
                <span>Size: <strong>{Math.round(validationResult.sizeBytes / 1024)} KB</strong></span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmRestore && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-rose-200 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-800">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="font-bold text-slate-900 text-base text-center mb-2">WARNING: CONFIRM RESTORE</h3>
            <p className="text-xs text-slate-700 leading-relaxed text-center mb-4">
              Restoring <strong className="text-slate-900 font-mono">{selectedFile}</strong> will replace the current active attendance database.
            </p>
            <p className="text-[11px] text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 mb-5 leading-relaxed">
              A safety rollback backup of the current database will be automatically created prior to replacement.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmRestore(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProceedRestore}
                disabled={actionLoading}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                {actionLoading ? 'Restoring...' : 'Yes, Restore Database'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Backups Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-sm">Backup History</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3 px-4">Filename</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {backups.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-6 text-center text-slate-400">
                    No backup files created yet.
                  </td>
                </tr>
              ) : (
                backups.map(b => (
                  <tr key={b.filename} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono font-medium text-slate-800">{b.filename}</td>
                    <td className="py-3 px-4 text-slate-500">{new Date(b.created_at).toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{Math.round(b.size_bytes / 1024)} KB</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                        {b.status || 'VALID'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <a
                        href={backupApi.getDownloadUrl(b.filename)}
                        download
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-xs font-semibold"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </a>
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
