'use client';
import { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, Minus, Users, Activity, AlertTriangle, Clock, Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const ABBR = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' };

const TABS = [
  { id: 'forecast', label: 'Call Volume Forecast', Icon: TrendingUp },
  { id: 'patterns', label: 'Demand Patterns', Icon: Activity },
  { id: 'staffing', label: 'Staffing', Icon: Users },
];

const CONF = {
  high:   { label: 'High confidence',   cls: 'bg-green-50 text-green-700 border-green-200' },
  medium: { label: 'Medium confidence', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  low:    { label: 'Low confidence',    cls: 'bg-orange-50 text-orange-700 border-orange-200' },
};

async function apiFetch(path) {
  const res = await fetch(`/api/proxy${path}`, { credentials: 'include' });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || `HTTP ${res.status}`); }
  return res.json();
}

function fmtMonth(m) {
  const [y, mo] = String(m).split('-');
  const d = new Date(Number(y), Number(mo) - 1, 1);
  return isNaN(d.getTime()) ? m : d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

function Kpi({ label, value, Icon }) {
  return (
    <div className="border rounded-lg p-3 bg-gray-50/60">
      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1">{Icon && <Icon size={12} />} {label}</div>
      <div className="text-lg font-bold text-gray-900 capitalize truncate">{value}</div>
    </div>
  );
}

export default function PredictiveAnalytics({ uploadId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('forecast');

  useEffect(() => {
    if (!uploadId) return;
    setLoading(true); setError(''); setData(null);
    apiFetch(`/data/uploads/${uploadId}/predictive`)
      .then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [uploadId]);

  if (loading) return (
    <div className="bg-white border rounded-xl p-6 animate-pulse space-y-3">
      <div className="h-5 w-48 bg-gray-100 rounded" />
      <div className="h-64 bg-gray-50 rounded" />
    </div>
  );
  if (error) return (
    <div className="bg-white border rounded-xl p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2"><TrendingUp size={18} /> Predictive Analytics</h2>
      <p className="text-sm text-red-600">{error}</p>
    </div>
  );
  if (!data?.available) return (
    <div className="bg-white border rounded-xl p-8 text-center">
      <TrendingUp size={26} className="mx-auto text-gray-300 mb-2" />
      <h2 className="text-base font-semibold text-gray-900 mb-1">Predictive Analytics</h2>
      <p className="text-sm text-gray-500">{data?.reason || 'Not enough data to generate predictions yet.'}</p>
    </div>
  );

  const conf = CONF[data.confidence] || CONF.low;
  const ctx = data.context || {};

  return (
    <div className="bg-white border rounded-xl shadow-sm">
      <div className="px-5 py-4 border-b flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-600" /> Predictive Analytics
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {ctx.total_calls?.toLocaleString()} calls · {ctx.history_start} → {ctx.history_end}
            {ctx.model_used ? ` · model: ${ctx.model_used}` : ''}
          </p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${conf.cls}`}>{conf.label}</span>
      </div>

      {data.warnings?.length > 0 && (
        <div className="mx-5 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 space-y-1">
          {data.warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-800 flex items-start gap-1.5">
              <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" /> {w}
            </p>
          ))}
        </div>
      )}

      <div className="px-5 pt-4">
        <div className="flex gap-1 border-b overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <t.Icon size={15} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        {tab === 'forecast' && <ForecastTab data={data} />}
        {tab === 'patterns' && <PatternsTab data={data} />}
        {tab === 'staffing' && <StaffingTab data={data} />}
      </div>
    </div>
  );
}

function ForecastTab({ data }) {
  const cvf = data.call_volume_forecast || {};
  if (!cvf.forecast_months) {
    return (
      <div className="text-center py-8">
        <Calendar size={24} className="mx-auto text-gray-300 mb-2" />
        <p className="text-sm font-medium text-gray-700 mb-1">Monthly forecast needs more history</p>
        <p className="text-xs text-gray-500 max-w-md mx-auto">
          {cvf.reason || 'At least ~7 months of data is required for the ML forecast.'} Demand patterns and staffing are available in the other tabs.
        </p>
      </div>
    );
  }
  const hist = Object.entries(cvf.historical || {});
  const rows = hist.map(([month, v]) => ({ month, label: fmtMonth(month), actual: v }));
  (cvf.forecast_months || []).forEach((m, i) => {
    rows.push({ month: m, label: fmtMonth(m), forecast: cvf.forecast_values[i], lower: cvf.forecast_lower?.[i], upper: cvf.forecast_upper?.[i] });
  });
  if (hist.length && rows.length > hist.length) rows[hist.length - 1].forecast = rows[hist.length - 1].actual;

  const dir = cvf.trend_direction;
  const DirIcon = dir === 'increasing' ? TrendingUp : dir === 'decreasing' ? TrendingDown : Minus;

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Kpi label="Trend" value={dir || '—'} Icon={DirIcon} />
        <Kpi label="Next month (est.)" value={cvf.forecast_values?.[0]?.toLocaleString() ?? '—'} />
        <Kpi label="Best model" value={cvf.model_name || '—'} />
        <Kpi label="Reliability" value={cvf.is_reliable ? 'Reliable' : 'Indicative'} />
      </div>
      <div className="chart-wrapper" style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="upper" stroke="#93C5FD" strokeWidth={1} strokeDasharray="2 3" dot={false} name="Upper" />
            <Line type="monotone" dataKey="lower" stroke="#93C5FD" strokeWidth={1} strokeDasharray="2 3" dot={false} name="Lower" />
            <Line type="monotone" dataKey="actual" stroke="#2563EB" strokeWidth={2} dot={false} name="Actual" />
            <Line type="monotone" dataKey="forecast" stroke="#16A34A" strokeWidth={2} strokeDasharray="5 4" dot={false} name="Forecast" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {cvf.reliability_warning && <p className="text-xs text-amber-700 mt-3">{cvf.reliability_warning}</p>}
      {cvf.model_reason && <p className="text-xs text-gray-400 mt-1">{cvf.model_reason}</p>}
    </div>
  );
}

function PatternsTab({ data }) {
  const p = data.patterns || {};
  const weekdayData = WEEKDAYS.filter((d) => d in (p.weekday || {})).map((d) => ({ day: ABBR[d], calls: p.weekday[d] }));
  const hourData = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}:00`, calls: (p.hour || {})[h] || 0 }));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Kpi label="Busiest weekday" value={p.busiest_weekday || '—'} Icon={Calendar} />
        <Kpi label="Busiest hour" value={p.busiest_hour != null ? `${p.busiest_hour}:00` : '—'} Icon={Clock} />
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-600 mb-2">Calls by weekday</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={weekdayData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <Bar dataKey="calls" fill="#2563EB" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-600 mb-2">Calls by hour of day</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={hourData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={2} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <Bar dataKey="calls" fill="#0EA5E9" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StaffingTab({ data }) {
  const s = data.staffing || {};
  const riskCls = { High: 'bg-red-100 text-red-700', Moderate: 'bg-yellow-100 text-yellow-700', Low: 'bg-green-100 text-green-700' };
  const rt = s.response_time || {};
  const ift = s.ift_crew || {};
  const hr = (h) => (h == null ? '' : h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`);
  const emerg = s.emergency_units ?? s.recommended_units_peak;
  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Kpi label="Emergency peak units" value={emerg ?? '—'} Icon={Users} />
        <Kpi label="+ Dedicated IFT crew" value={ift.recommended ? `${ift.units} unit${ift.units > 1 ? 's' : ''}` : 'Not needed'} Icon={Activity} />
        <Kpi label="Response P90" value={rt.p90_minutes != null ? `${rt.p90_minutes} min` : '—'} Icon={Clock} />
        <Kpi label="Utilization" value={s.projected_unit_hour_utilization != null ? `${Math.round(s.projected_unit_hour_utilization * 100)}%` : '—'} Icon={Activity} />
      </div>

      <div className="mb-5 rounded-lg border bg-gray-50/70 px-4 py-3 text-xs text-gray-600 space-y-1">
        <p>
          <strong className="text-gray-800">{emerg} emergency units</strong> = {s.coverage_units} for station coverage
          {rt.adjustment_units > 0 && <> {' + '}{rt.adjustment_units} for response time (P90 {rt.p90_minutes} min vs {rt.target_p90_minutes} min target)</>}
          {rt.adjustment_units === 0 && rt.meeting_target === true && <> (response time on target)</>}.
        </p>
        {ift.recommended && (
          <p>
            <strong className="text-indigo-700">+ {ift.units} dedicated IFT crew</strong>, {ift.window_days} {hr(ift.window_start)}–{hr(ift.window_end)} (~{ift.weekly_transfers} transfers/wk) — keeps emergency units free. Total in the transfer window: <strong>{s.total_units_in_ift_window}</strong>.
          </p>
        )}
      </div>
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b text-[11px] uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Weekday</th>
              <th className="px-4 py-2.5 text-right font-medium">Predicted calls</th>
              <th className="px-4 py-2.5 text-right font-medium">Recommended units</th>
              <th className="px-4 py-2.5 text-right font-medium">Demand</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(s.by_weekday || []).map((r) => (
              <tr key={r.weekday} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-gray-700">{r.weekday}</td>
                <td className="px-4 py-2.5 text-right text-gray-600">{r.predicted_calls}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{r.recommended_units}</td>
                <td className="px-4 py-2.5 text-right">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${riskCls[r.risk] || ''}`}>{r.risk}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-3">{s.disclaimer}</p>
    </div>
  );
}
