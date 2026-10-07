import React, { useState, useEffect } from 'react';
import { Cpu, Fingerprint, Activity, RefreshCw, CheckCircle2, XCircle, AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react';
import { deviceApi } from '../../services/api';
import DeviceCard from '../../components/DeviceCard';

export default function DevicePage() {
  const [deviceStatus, setDeviceStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchStatus = async () => {
    try {
      const data = await deviceApi.getStatus();
      setDeviceStatus(data);
    } catch (e) {
      setDeviceStatus({ status: 'NOT CONNECTED' });
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
      setMessage('Test result: ' + (res.message || 'Sensor responsive'));
      fetchStatus();
    } catch (e) {
      setMessage('Test error: ' + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReconnect = async () => {
    setActionLoading(true);
    setMessage('');
    try {
      const res = await deviceApi.reconnect();
      setMessage('Reconnect result: ' + (res.message || 'Completed'));
      fetchStatus();
    } catch (e) {
      setMessage('Reconnect error: ' + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleSimulator = async () => {
    setActionLoading(true);
    try {
      const isSimEnabled = deviceStatus?.mode === 'SIMULATOR';
      await deviceApi.setSimulator(!isSimEnabled, false);
      fetchStatus();
    } catch (e) {
      setMessage('Error toggling virtual testing mode');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-slate-800">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Fingerprint Hardware Diagnostics</h2>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Monitor Mantra MFS100 V54 optical biometric sensor, driver layer, and C# localhost communication bridge
        </p>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs flex items-center gap-2 font-medium">
          <Activity className="w-4 h-4 shrink-0 text-indigo-600" />
          <span>{message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DeviceCard onStatusUpdate={setDeviceStatus} />

        {/* C# Bridge Connection Details */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Cpu className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Bridge Architecture</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block text-[11px] mb-1 font-medium">Bridge Target URL:</span>
              <code className="text-indigo-600 font-mono font-semibold">http://127.0.0.1:8765/status</code>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block text-[11px] mb-1 font-medium">Active Operating Mode:</span>
              <span className="font-bold text-slate-900">
                {deviceStatus?.bridgeConnected ? 'Hardware Mode (C# MFS100 SDK)' : (deviceStatus?.mode === 'SIMULATOR' ? 'Virtual Scanner (Testing Mode)' : 'Physical Scanner (Unplugged)')}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block text-[11px] mb-1 font-medium">Optical Sensor Status:</span>
              <span className={`font-bold ${
                deviceStatus?.status === 'READY' || deviceStatus?.status === 'CONNECTED' ? 'text-emerald-700' : 'text-rose-600'
              }`}>
                {deviceStatus?.status || 'CHECKING'}
              </span>
            </div>
          </div>

          {/* Development Testing Toggle */}
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={handleToggleSimulator}
              className="flex items-center justify-between w-full p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs text-slate-700 transition-colors cursor-pointer border border-slate-200"
            >
              <span className="font-medium">Virtual Scanner Mode (Software Testing):</span>
              {deviceStatus?.mode === 'SIMULATOR' ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1">Enabled</span>
              ) : (
                <span className="text-slate-400 font-bold flex items-center gap-1">Disabled</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
