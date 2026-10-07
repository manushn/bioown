import React, { useState, useEffect } from 'react';
import { deviceApi } from '../services/api';
import { Fingerprint, RefreshCw, CheckCircle, AlertTriangle, XCircle, Activity, ToggleLeft, ToggleRight } from 'lucide-react';

export default function DeviceCard({ onStatusUpdate }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchStatus = async () => {
    try {
      const data = await deviceApi.getStatus();
      setStatus(data);
      if (onStatusUpdate) onStatusUpdate(data);
    } catch (err) {
      const offline = {
        device: 'MFS100 V54',
        status: 'NOT CONNECTED',
        usbDetected: false,
        driverOk: false,
        sdkInitialized: false,
        scannerReady: false
      };
      setStatus(offline);
      if (onStatusUpdate) onStatusUpdate(offline);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleTest = async () => {
    setActionLoading(true);
    setMessage('');
    try {
      const res = await deviceApi.testDevice();
      setMessage(res.message || 'Scanner test completed');
      fetchStatus();
    } catch (err) {
      setMessage('Test failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReconnect = async () => {
    setActionLoading(true);
    setMessage('');
    try {
      const res = await deviceApi.reconnect();
      setMessage(res.message || 'Reconnected scanner');
      fetchStatus();
    } catch (err) {
      setMessage('Reconnect failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleSimulator = async () => {
    setActionLoading(true);
    try {
      const isSimEnabled = status?.mode === 'SIMULATOR';
      await deviceApi.setSimulator(!isSimEnabled, false);
      fetchStatus();
    } catch (err) {
      setMessage('Failed to toggle virtual scanner');
    } finally {
      setActionLoading(false);
    }
  };

  const isReady = status?.status === 'READY';
  const isBusy = status?.status === 'SCANNER BUSY';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-slate-800">
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-lg ${isReady ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            <Fingerprint className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm tracking-wide">FINGERPRINT DEVICE</h3>
            <span className="text-xs text-slate-500 font-mono">{status?.device || 'MFS100 V54'}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${
            isReady ? 'bg-emerald-500 animate-pulse' : isBusy ? 'bg-amber-500' : 'bg-rose-500'
          }`} />
          <span className={`text-xs font-bold ${
            isReady ? 'text-emerald-700' : isBusy ? 'text-amber-700' : 'text-rose-700'
          }`}>
            {status?.status || 'INITIALIZING'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-4 text-xs">
        <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200/80">
          <span className="text-slate-600">USB Hardware:</span>
          <span className="flex items-center gap-1 font-medium">
            {status?.usbDetected ? (
              <span className="text-emerald-700 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Detected</span>
            ) : (
              <span className="text-rose-600 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Missing</span>
            )}
          </span>
        </div>

        <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200/80">
          <span className="text-slate-600">MFS100 Driver:</span>
          <span className="flex items-center gap-1 font-medium">
            {status?.driverOk ? (
              <span className="text-emerald-700 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> OK</span>
            ) : (
              <span className="text-slate-400 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Offline</span>
            )}
          </span>
        </div>

        <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200/80">
          <span className="text-slate-600">SDK Layer:</span>
          <span className="flex items-center gap-1 font-medium">
            {status?.sdkInitialized ? (
              <span className="text-emerald-700 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> OK</span>
            ) : (
              <span className="text-slate-400 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Offline</span>
            )}
          </span>
        </div>

        <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200/80">
          <span className="text-slate-600">Optical Sensor:</span>
          <span className="flex items-center gap-1 font-medium">
            {status?.scannerReady ? (
              <span className="text-emerald-700 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Ready</span>
            ) : (
              <span className="text-rose-600 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Offline</span>
            )}
          </span>
        </div>
      </div>

      {status?.lastCheckedAt && (
        <p className="text-[11px] text-slate-500 mb-3">
          Last checked: {new Date(status.lastCheckedAt).toLocaleTimeString()}
          {status.mode === 'SIMULATOR' && ' • (Virtual Testing Mode)'}
        </p>
      )}

      {message && (
        <div className="p-2.5 mb-3 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
          {message}
        </div>
      )}

      <div className="flex gap-2 mb-3">
        <button
          onClick={handleTest}
          disabled={actionLoading}
          className="flex-1 py-1.5 px-3 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Activity className="w-3.5 h-3.5" />
          Test Scanner
        </button>
        <button
          onClick={handleReconnect}
          disabled={actionLoading}
          className="flex-1 py-1.5 px-3 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
          Reconnect
        </button>
      </div>

      {/* Virtual Scanner Toggle for testing on machines without physical USB scanner */}
      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-500 text-[11px]">Virtual Scanner for Testing:</span>
        <button
          onClick={handleToggleSimulator}
          disabled={actionLoading}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
            status?.mode === 'SIMULATOR' 
              ? 'bg-amber-100 text-amber-800 border border-amber-300' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {status?.mode === 'SIMULATOR' ? (
            <>
              <ToggleRight className="w-4 h-4 text-amber-600" />
              <span>Active</span>
            </>
          ) : (
            <>
              <ToggleLeft className="w-4 h-4 text-slate-400" />
              <span>Enable</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
