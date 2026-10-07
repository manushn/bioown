import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, Filter, RefreshCw } from 'lucide-react';
import { auditApi } from '../../services/api';

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [eventTypeFilter, setEventTypeFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await auditApi.getLogs({
        eventType: eventTypeFilter !== 'All' ? eventTypeFilter : undefined
      });
      setLogs(data);
    } catch (err) {
      console.error('Error loading audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [eventTypeFilter]);

  const eventTypes = [
    'All',
    'ADMIN_LOGIN_SUCCESS',
    'ADMIN_LOGIN_FAILED',
    'PASSWORD_CHANGED',
    'PASSWORD_RESET',
    'STAFF_CREATED',
    'STAFF_UPDATED',
    'STAFF_DEACTIVATED',
    'FINGERPRINT_ENROLLED',
    'FINGERPRINT_REMOVED',
    'ATTENDANCE_OVERRIDE',
    'RULES_UPDATED',
    'BACKUP_CREATED',
    'BACKUP_RESTORED'
  ];

  return (
    <div className="space-y-6 text-slate-800">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">System & Security Audit Log</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Immutable audit trail of administrator sessions, biometric updates, attendance overrides, and database operations
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition-colors self-start md:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-3 text-xs">
        <Filter className="w-4 h-4 text-slate-400" />
        <span className="text-slate-600 font-medium">Filter Event:</span>
        <select
          value={eventTypeFilter}
          onChange={(e) => setEventTypeFilter(e.target.value)}
          className="bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-600 font-medium"
        >
          {eventTypes.map(e => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-slate-400">
                    {loading ? 'Loading audit records...' : 'No audit entries found.'}
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.event_type.includes('SUCCESS') || log.event_type.includes('CREATED')
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : log.event_type.includes('FAILED')
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : log.event_type.includes('OVERRIDE') || log.event_type.includes('RESTORED')
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}>
                        {log.event_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {log.admin_username || 'System'}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      <div>{log.description}</div>
                      {log.metadata && (
                        <code className="text-[10px] text-slate-400 font-mono block mt-0.5 truncate max-w-lg">
                          {log.metadata}
                        </code>
                      )}
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
