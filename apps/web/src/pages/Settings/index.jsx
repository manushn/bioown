import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { rulesApi } from '../../services/api';

export default function SettingsPage() {
  const [rules, setRules] = useState({
    rule_name: 'Standard College Staff Timings',
    checkin_target: '09:25:00',
    checkin_start: '08:00:00',
    checkin_end: '11:00:00',
    half_checkout_start: '12:00:00',
    half_checkout_end: '14:30:00',
    half_checkin_start: '14:31:00',
    half_checkin_end: '16:00:00',
    checkout_target: '17:30:00',
    checkout_start: '16:01:00',
    checkout_end: '20:00:00',
    full_day_required_minutes: 420,
    half_day_required_minutes: 210,
    late_compensation_enabled: 1,
    allow_admin_override: 1
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRules = async () => {
      try {
        const data = await rulesApi.getRules();
        setRules(data);
      } catch (err) {
        setError('Failed to load rules: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRules();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const res = await rulesApi.updateRules(rules);
      setMessage('Attendance rules and timing policies updated successfully.');
      if (res.rule) setRules(res.rule);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save rules');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-slate-800">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Attendance Rules & Policies</h2>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Configure daily check-in deadlines, late-in compensation, time windows, and half-day requirements
        </p>
      </div>

      {message && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Morning Check-In Section */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Clock className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Morning Check-In Policy</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Official Check-In Deadline *
              </label>
              <input
                type="text"
                value={rules.checkin_target}
                onChange={(e) => setRules({ ...rules, checkin_target: e.target.value })}
                required
                placeholder="09:25:00"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-medium focus:bg-white focus:border-indigo-600"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Default: 09:25:00 AM</span>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Check-In Window Start
              </label>
              <input
                type="text"
                value={rules.checkin_start}
                onChange={(e) => setRules({ ...rules, checkin_start: e.target.value })}
                required
                placeholder="08:00:00"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-medium focus:bg-white focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Check-In Window End
              </label>
              <input
                type="text"
                value={rules.checkin_end}
                onChange={(e) => setRules({ ...rules, checkin_end: e.target.value })}
                required
                placeholder="11:00:00"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-medium focus:bg-white focus:border-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* Evening Check-Out Section */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Clock className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Evening Check-Out Policy</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Official Check-Out Time *
              </label>
              <input
                type="text"
                value={rules.checkout_target}
                onChange={(e) => setRules({ ...rules, checkout_target: e.target.value })}
                required
                placeholder="17:30:00"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-medium focus:bg-white focus:border-indigo-600"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Default: 17:30:00 (5:30 PM)</span>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Checkout Window Start
              </label>
              <input
                type="text"
                value={rules.checkout_start}
                onChange={(e) => setRules({ ...rules, checkout_start: e.target.value })}
                required
                placeholder="16:01:00"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-medium focus:bg-white focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Checkout Window End
              </label>
              <input
                type="text"
                value={rules.checkout_end}
                onChange={(e) => setRules({ ...rules, checkout_end: e.target.value })}
                required
                placeholder="20:00:00"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-medium focus:bg-white focus:border-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* Midday & Half-Day Policy */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Clock className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Midday Leave & Half-Day Windows</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Half-Day Departure Window</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={rules.half_checkout_start}
                  onChange={(e) => setRules({ ...rules, half_checkout_start: e.target.value })}
                  placeholder="12:00:00"
                  className="w-1/2 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-medium"
                />
                <input
                  type="text"
                  value={rules.half_checkout_end}
                  onChange={(e) => setRules({ ...rules, half_checkout_end: e.target.value })}
                  placeholder="14:30:00"
                  className="w-1/2 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Midday Return Window</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={rules.half_checkin_start}
                  onChange={(e) => setRules({ ...rules, half_checkin_start: e.target.value })}
                  placeholder="14:31:00"
                  className="w-1/2 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-medium"
                />
                <input
                  type="text"
                  value={rules.half_checkin_end}
                  onChange={(e) => setRules({ ...rules, half_checkin_end: e.target.value })}
                  placeholder="16:00:00"
                  className="w-1/2 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Working Duration & Late Compensation Rules */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm pb-3 border-b border-slate-100">
            Attendance Calculation & Compensation Rules
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Full-Day Minimum Required Working Minutes
              </label>
              <input
                type="number"
                value={rules.full_day_required_minutes}
                onChange={(e) => setRules({ ...rules, full_day_required_minutes: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-medium"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">420 minutes = 7.0 hours</span>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Half-Day Minimum Required Working Minutes
              </label>
              <input
                type="number"
                value={rules.half_day_required_minutes}
                onChange={(e) => setRules({ ...rules, half_day_required_minutes: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-medium"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">210 minutes = 3.5 hours</span>
            </div>
          </div>

          {/* Late Check-in Compensation Toggle (Section 12 Rule) */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={!!rules.late_compensation_enabled}
                onChange={(e) => setRules({ ...rules, late_compensation_enabled: e.target.checked ? 1 : 0 })}
                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Enable Late Check-in Compensation Rule
                </span>
                <span className="text-xs text-slate-600 block mt-0.5 leading-relaxed">
                  If a staff member checks in late in the morning (e.g. 5 minutes late at 09:30), their expected checkout moves later by the exact same duration in the afternoon (e.g. 17:35 instead of 17:30).
                </span>
              </div>
            </label>
          </div>
        </div>

        <div className="text-right">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs tracking-wide shadow-sm shadow-indigo-600/20 transition-colors inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Timing Policies'}
          </button>
        </div>
      </form>
    </div>
  );
}
