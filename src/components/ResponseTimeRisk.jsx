'use client';
import { useState, useEffect } from 'react';
import { Clock, CloudSnow, AlertTriangle, Gauge } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';

const WEATHER_LABEL = {
  clear: 'Clear', rain: 'Rain', heavy_rain: 'Heavy rain', snow: 'Snow', ice: 'Ice',
  wind: 'High wind', cold: 'Cold', extreme_heat: 'Extreme heat',
};
const TARGETS = [8, 9, 10, 12];

async function apiFetch(path) {
  const res = await fetch(`/api/proxy${path}`, { credentials: 'include' });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || `HTTP ${res.status}`); }
  return res.json();
}

function Kpi({ label, value, sub, Icon }) {
  return (
    <div className="border rounded-lg p-3 bg-gray-50/60">
      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1">{Icon && <Icon size={12} />} {label}</div>
      <div className="text-lg font-bold text-gray-900">{value}</div>
      {sub && <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function ResponseTimeRisk({ uploadId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [target, setTarget] = useState(9);

  useEffect(() => {
    if (!uploadId) return;
    setLoading(true); setError('');
    apiFetch(`/data/uploads/${uploadId}/response-time-risk?target_minutes=${target}`)
      .then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [uploadId, target]);

  if (loading && !data) return (
    <div className="bg-white border rounded-xl p-6 animate-pulse space-y-3">
      <div className="h-5 w-44 bg-gray-100 rounded" />
      <div className="h-56 bg-gray-50 rounded" />
    </div>
  );
  if (error) return (
    <div className="bg-white border rounded-xl p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2"><Clock size={18} /> Response-Time Risk</h2>
      <p className="text-sm text-red-600">{error}</p>
    </div>
  );
  if (!data?.available) return (
    <div className="bg-white border rounded-xl p-8 text-center">
      <Clock size={26} className="mx-auto text-gray-300 mb-2" />
      <h2 className="text-base font-semibold text-gray-900 mb-1">Response-Time Risk</h2>
      <p className="text-sm text-gray-500 max-w-md mx-auto">{data?.reason || 'Not enough timing data to analyze response-time risk.'}</p>
    </div>
  );

  const s = data.summary || {};
  const weather = (data.weather_impact || []).map((w) => ({ ...w, label: WEATHER_LABEL[w.condition] || w.condition }));
  const byHour = (data.by_hour || []).map((h) => ({ ...h, label: `${h.hour}:00` }));
  const worst = weather.length ? weather[0] : null;
  const clear = weather.find((w) => w.condition === 'clear');
  const barColor = (p90) => (p90 > target ? '#DC2626' : '#16A34A');

  return (
    <div className="bg-white border rounded-xl shadow-sm">
      <div className="px-5 py-4 border-b flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Clock size={18} className="text-blue-600" /> Response-Time Risk
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Dispatch → on-scene · weather + hour-of-day{data.traffic_provider === 'time_proxy' ? ' (traffic proxy)' : ''}
          </p>
        </div>
        <label className="text-xs text-gray-500 flex items-center gap-1.5">
          Target
          <select value={target} onChange={(e) => setTarget(Number(e.target.value))}
            className="border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {TARGETS.map((t) => <option key={t} value={t}>{t} min</option>)}
          </select>
        </label>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Kpi label="Overall P90" value={s.overall_p90 != null ? `${s.overall_p90}m` : '—'} Icon={Gauge} />
          <Kpi label="Median" value={s.overall_median != null ? `${s.overall_median}m` : '—'} Icon={Clock} />
          <Kpi label={`Over ${target}m target`} value={`${s.pct_over_target}%`} Icon={AlertTriangle} />
          <Kpi label="Worst weather" value={worst ? `${worst.p90}m` : '—'} sub={worst ? WEATHER_LABEL[worst.condition] || worst.condition : ''} Icon={CloudSnow} />
        </div>

        {weather.length > 0 ? (
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">P90 response time by weather condition</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weather} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}m`} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v, n) => [`${v} min`, n === 'p90' ? 'P90' : n]} />
                <ReferenceLine y={target} stroke="#F59E0B" strokeDasharray="4 3" label={{ value: `target ${target}m`, fontSize: 10, fill: '#B45309', position: 'right' }} />
                <Bar dataKey="p90" radius={[4, 4, 0, 0]}>
                  {weather.map((w) => <Cell key={w.condition} fill={barColor(w.p90)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {worst && clear && worst.condition !== 'clear' && (
              <p className="text-xs text-gray-500 mt-2">
                <span className="font-medium text-gray-700">{WEATHER_LABEL[worst.condition] || worst.condition}</span> conditions run
                <span className="font-medium text-red-600"> +{(worst.p90 - clear.p90).toFixed(1)} min </span>
                slower at the 90th percentile than clear weather ({worst.p90}m vs {clear.p90}m), with {worst.pct_over_target}% of calls over target.
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400">{data.warnings?.join(' ') || 'Weather impact unavailable.'}</p>
        )}

        {byHour.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">P90 response time by hour of day <span className="font-normal text-gray-400">(traffic proxy)</span></p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byHour} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={2} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}m`} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v) => [`${v} min`, 'P90']} />
                <ReferenceLine y={target} stroke="#F59E0B" strokeDasharray="4 3" />
                <Bar dataKey="p90" radius={[3, 3, 0, 0]}>
                  {byHour.map((h) => <Cell key={h.hour} fill={barColor(h.p90)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {(data.by_township || []).length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Highest-risk areas (by P90)</p>
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b text-[11px] uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-medium">Area</th>
                    <th className="px-3 py-2.5 text-right font-medium">Calls</th>
                    <th className="px-3 py-2.5 text-right font-medium">P90</th>
                    <th className="px-3 py-2.5 text-right font-medium">% over {target}m</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.by_township.map((t) => (
                    <tr key={t.township} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-700">{t.township}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{t.calls.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900">{t.p90}m</td>
                      <td className="px-3 py-2 text-right">
                        <span className={t.pct_over_target >= 50 ? 'text-red-600 font-medium' : 'text-gray-600'}>{t.pct_over_target}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="text-[11px] text-gray-400">
          Decision-support estimates from historical patterns + weather. Traffic uses an hour-of-day proxy; a live traffic feed can be added.
        </p>
      </div>
    </div>
  );
}
