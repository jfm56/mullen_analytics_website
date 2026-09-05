'use client';
import { useState, useEffect } from 'react';
import {
  Activity, Phone, Truck, Clock, MapPin, AlertTriangle, TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import CHART from '@/lib/chartTheme';

async function apiFetch(path) {
  const res = await fetch(`/api/proxy${path}`, { credentials: 'include' });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || `HTTP ${res.status}`); }
  return res.json();
}

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

export default function EmergencyTransportOutlook({ uploadId, combined = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!combined && !uploadId) return;
    setLoading(true); setError(''); setData(null);
    apiFetch(combined ? `/data/combined-dashboard/emergency-transport` : `/data/uploads/${uploadId}/emergency-transport?horizon=14`)
      .then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [uploadId, combined]);

  if (loading) return (
    <div className="bg-white border rounded-xl p-6 animate-pulse space-y-3">
      <div className="h-5 w-56 bg-gray-100 rounded" /><div className="h-48 bg-gray-50 rounded" />
    </div>
  );
  if (error) return (
    <div className="bg-white border rounded-xl p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2"><Activity size={18} /> Emergency Transport Outlook</h2>
      <p className="text-sm text-red-600">{error}</p>
    </div>
  );
  if (!data?.available) return null;
  if (!data.applicable) return (
    <div className="bg-white border rounded-xl p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2"><Activity size={18} className="text-gray-400" /> Emergency Transport Outlook</h2>
      <p className="text-sm text-gray-500">{data.reason}</p>
    </div>
  );

  const ctx = data.context || {};
  const TrendIcon = data.trend === 'rising' ? TrendingUp : data.trend === 'falling' ? TrendingDown : Minus;
  const hasTransports = data.transports != null;
  const eventNoun = data.event_label === 'emergency transports' ? 'transports' : 'calls';

  const dowData = (data.by_weekday || []).map((w) => ({ day: w.weekday.slice(0, 3), avg: w.avg_per_day }));
  const hourData = Array.from({ length: 24 }, (_, h) => ({ hour: h, label: `${h}`, calls: (data.by_hour || {})[h] || 0 }));
  const fc = data.forecast || [];
  const byLoc = data.by_location || [];
  const locMax = Math.max(1, ...byLoc.map((l) => l.count));
  const r = data.response;

  return (
    <div className="bg-white border rounded-xl shadow-sm">
      <div className="px-5 py-4 border-b flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Activity size={18} className="text-rose-600" /> Emergency Transport Outlook
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Emergency (911) demand · {data.emergency_calls?.toLocaleString()} emergency calls
            {hasTransports ? ` · ${data.transports?.toLocaleString()} transports` : ''} · {ctx.history_start} → {ctx.history_end}
          </p>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-rose-50 text-rose-700 border-rose-200 flex items-center gap-1">
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
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Kpi label="Emergency calls" value={data.emergency_calls?.toLocaleString() ?? '—'} Icon={Phone} />
          <Kpi
            label={hasTransports ? 'Transport rate' : 'Transports'}
            value={hasTransports ? `${data.transport_rate_pct}%` : '—'}
            Icon={Truck}
            sub={hasTransports ? `${data.transports?.toLocaleString()} of ${data.emergency_calls?.toLocaleString()}` : 'no disposition field'}
          />
          <Kpi label={`Expected / week`} value={data.weekly_expected} Icon={Activity} sub={data.event_label} />
          <Kpi
            label="Response (median · P90)"
            value={r ? `${r.median_minutes}m · ${r.p90_minutes}m` : '—'}
            Icon={Clock}
            sub={r ? 'dispatch → on-scene' : undefined}
          />
        </div>

        {/* Patterns */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Avg emergency {eventNoun} per day of week</p>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={dowData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v) => [`${v}/day`, `avg ${eventNoun}`]} />
                <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                  {dowData.map((d, i) => <Cell key={i} fill={i < 5 ? CHART.bad : CHART.badLight} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Emergency {eventNoun} by hour of day</p>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={hourData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={2} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v) => [v, eventNoun]} labelFormatter={(h) => fmtHour(Number(h))} />
                <Bar dataKey="calls" radius={[3, 3, 0, 0]}>
                  {hourData.map((d) => <Cell key={d.hour} fill={d.hour === data.peak_hour ? CHART.bad : CHART.badLight} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Where emergencies occur */}
        {byLoc.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
              <MapPin size={12} /> Where emergency {eventNoun} occur (scene area)
            </p>
            <div className="space-y-1.5">
              {byLoc.slice(0, 8).map((l) => (
                <div key={l.location}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-gray-700 truncate flex items-center gap-1">
                      {l.location}{!l.mapped && <span className="text-[10px] text-gray-300">(no map)</span>}
                    </span>
                    <span className="text-gray-500 whitespace-nowrap">{l.count} · {l.share_pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(l.count / locMax) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* By type + 14-day forecast */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Top emergency call types</p>
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
            <p className="text-xs font-semibold text-gray-600 mb-2">Next 14 days (expected emergency {eventNoun})</p>
            <div className="grid grid-cols-7 gap-1">
              {fc.map((f) => (
                <div key={f.date} className="text-center" title={`${f.weekday} ${f.date}: ~${f.expected}`}>
                  <div className="text-[9px] text-gray-400">{f.weekday.slice(0, 1)}</div>
                  <div className="h-10 flex items-end justify-center">
                    <div className="w-4 bg-rose-400 rounded-t" style={{ height: `${Math.min(100, (f.expected / Math.max(1, ...fc.map((x) => x.expected))) * 100)}%` }} />
                  </div>
                  <div className="text-[9px] text-gray-600">{f.expected}</div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">Day-of-week seasonal estimate · {ctx.method}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
