'use client';
import { useState, useEffect } from 'react';
import {
  Truck, CalendarClock, Clock, Repeat, TrendingUp, TrendingDown, Minus, AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';

async function apiFetch(path) {
  const res = await fetch(`/api/proxy${path}`, { credentials: 'include' });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || `HTTP ${res.status}`); }
  return res.json();
}

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const fmtHour = (h) => (h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`);

function Kpi({ label, value, Icon, sub }) {
  return (
    <div className="border rounded-lg p-3 bg-gray-50/60">
      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1">{Icon && <Icon size={12} />} {label}</div>
      <div className="text-lg font-bold text-gray-900 truncate">{value}</div>
      {sub && <div className="text-[11px] text-gray-400 mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

export default function IftOutlook({ uploadId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!uploadId) return;
    setLoading(true); setError(''); setData(null);
    apiFetch(`/data/uploads/${uploadId}/forecast/ift?horizon=14`)
      .then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [uploadId]);

  if (loading) return (
    <div className="bg-white border rounded-xl p-6 animate-pulse space-y-3">
      <div className="h-5 w-56 bg-gray-100 rounded" /><div className="h-48 bg-gray-50 rounded" />
    </div>
  );
  if (error) return (
    <div className="bg-white border rounded-xl p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2"><Truck size={18} /> Interfacility Transport Outlook</h2>
      <p className="text-sm text-red-600">{error}</p>
    </div>
  );
  if (!data?.available) return null;

  // Not-applicable state (little/no IFT for this agency).
  if (!data.applicable) return (
    <div className="bg-white border rounded-xl p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2"><Truck size={18} className="text-gray-400" /> Interfacility Transport Outlook</h2>
      <p className="text-sm text-gray-500">{data.reason}</p>
      <p className="text-xs text-gray-400 mt-1">{data.ift_count} IFT records · {data.ift_share_pct}% of volume.</p>
    </div>
  );

  const ctx = data.context || {};
  const sched = data.schedule_recommendation || {};
  const TrendIcon = data.trend === 'rising' ? TrendingUp : data.trend === 'falling' ? TrendingDown : Minus;

  const dowData = (data.by_weekday || []).map((w) => ({ day: w.weekday.slice(0, 3), avg: w.avg_per_day }));
  const hourData = Array.from({ length: 24 }, (_, h) => ({ hour: h, label: `${h}`, calls: (data.by_hour || {})[h] || 0 }));
  const inWindow = (h) => h >= sched.window_start && h < sched.window_end;
  const fc = data.forecast || [];

  return (
    <div className="bg-white border rounded-xl shadow-sm">
      <div className="px-5 py-4 border-b flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Truck size={18} className="text-indigo-600" /> Interfacility Transport Outlook
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Scheduled transfers · {data.ift_count} IFTs ({data.ift_share_pct}% of volume) · {ctx.history_start} → {ctx.history_end}
          </p>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200 flex items-center gap-1">
          <TrendIcon size={12} /> {data.trend}
        </span>
      </div>

      {data.warnings?.length > 0 && (
        <div className="mx-5 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 space-y-1">
          {data.warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-800 flex items-start gap-1.5"><AlertTriangle size={12} className="mt-0.5 flex-shrink-0" /> {w}</p>
          ))}
        </div>
      )}

      <div className="p-5 space-y-6">
        {/* Schedule recommendation — the headline */}
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-indigo-800 mb-1">
            <CalendarClock size={16} /> Suggested transport schedule
          </div>
          <p className="text-sm text-indigo-900">
            Staff a dedicated IFT crew <strong>{sched.window_days}, {fmtHour(sched.window_start)}–{fmtHour(sched.window_end)}</strong> —
            this window covers <strong>{sched.pct_of_all_ift_covered}%</strong> of all transfers (~{sched.avg_ift_per_shift}/weekday).
          </p>
          <p className="text-xs text-indigo-700/80 mt-1">{sched.note}</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Kpi label="IFTs / week (expected)" value={data.weekly_expected_ift} Icon={Repeat} />
          <Kpi label="Share of all calls" value={`${data.ift_share_pct}%`} Icon={Truck} />
          <Kpi label="Busiest IFT day" value={(data.by_weekday || []).reduce((b, w) => (w.avg_per_day > (b?.avg_per_day ?? -1) ? w : b), null)?.weekday || '—'} Icon={CalendarClock} />
          <Kpi label="Peak window" value={`${fmtHour(sched.window_start)}–${fmtHour(sched.window_end)}`} Icon={Clock} sub={`${sched.window_days} · ${sched.shift_hours}h`} />
        </div>

        {/* Patterns */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Avg transfers per day of week</p>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={dowData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v) => [`${v}/day`, 'avg IFT']} />
                <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                  {dowData.map((d, i) => <Cell key={i} fill={i < 5 ? '#6366f1' : '#c7d2fe'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Transfers by hour of day <span className="font-normal text-gray-400">(shaded = suggested window)</span></p>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={hourData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={2} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v) => [v, 'transfers']} labelFormatter={(h) => fmtHour(Number(h))} />
                <Bar dataKey="calls" radius={[3, 3, 0, 0]}>
                  {hourData.map((d) => <Cell key={d.hour} fill={inWindow(d.hour) ? '#6366f1' : '#e0e7ff'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By type + 14-day forecast */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Transfer types</p>
            <div className="space-y-1.5">
              {(data.by_type || []).map((t) => (
                <div key={t.type} className="flex justify-between text-xs">
                  <span className="text-gray-700 truncate pr-2">{t.type}</span>
                  <span className="text-gray-500 whitespace-nowrap">{t.count}</span>
                </div>
              ))}
              {(data.by_type || []).length === 0 && <p className="text-xs text-gray-400">Type breakdown unavailable.</p>}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Next 14 days (expected transfers)</p>
            <div className="grid grid-cols-7 gap-1">
              {fc.map((f) => (
                <div key={f.date} className="text-center" title={`${f.weekday} ${f.date}: ~${f.expected_ift}`}>
                  <div className="text-[9px] text-gray-400">{f.weekday.slice(0, 1)}</div>
                  <div className="h-10 flex items-end justify-center">
                    <div className="w-4 bg-indigo-400 rounded-t" style={{ height: `${Math.min(100, (f.expected_ift / 2) * 100)}%` }} />
                  </div>
                  <div className="text-[9px] text-gray-600">{f.expected_ift}</div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">Day-of-week seasonal estimate (scheduled demand) · {ctx.method}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
