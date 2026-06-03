'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Car, Clock, CalendarDays, CloudRain } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

const TownshipMap = dynamic(() => import('./TownshipMap'), {
  ssr: false,
  loading: () => <div className="h-[380px] bg-gray-50 rounded-lg animate-pulse" />,
});

const WEATHER_LABEL = {
  clear: 'Clear', rain: 'Rain', heavy_rain: 'Heavy rain', snow: 'Snow', ice: 'Ice',
  wind: 'High wind', cold: 'Cold', extreme_heat: 'Extreme heat',
};

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

function fmtHour(h) { return h == null ? '—' : `${h}:00`; }

export default function MvaHotspots({ uploadId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!uploadId) return;
    setLoading(true); setError(''); setData(null);
    apiFetch(`/data/uploads/${uploadId}/mva-hotspots`)
      .then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [uploadId]);

  if (loading) return (
    <div className="bg-white border rounded-xl p-6 animate-pulse space-y-3">
      <div className="h-5 w-52 bg-gray-100 rounded" />
      <div className="h-64 bg-gray-50 rounded" />
    </div>
  );
  if (error) return (
    <div className="bg-white border rounded-xl p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2"><Car size={18} /> MVA Hotspots</h2>
      <p className="text-sm text-red-600">{error}</p>
    </div>
  );
  if (!data?.available) return (
    <div className="bg-white border rounded-xl p-8 text-center">
      <Car size={26} className="mx-auto text-gray-300 mb-2" />
      <h2 className="text-base font-semibold text-gray-900 mb-1">MVA Hotspots</h2>
      <p className="text-sm text-gray-500 max-w-md mx-auto">{data?.reason || 'No motor-vehicle-collision data detected for this upload.'}</p>
    </div>
  );

  const s = data.summary || {};
  const points = data.map_points || [];
  const weather = (data.by_weather || []).map((w) => ({ ...w, label: WEATHER_LABEL[w.condition] || w.condition }));
  const byHour = (data.by_hour || []).map((h) => ({ ...h, label: `${h.hour}:00` }));
  const clear = weather.find((w) => w.condition === 'clear');
  const worst = weather.length ? weather[0] : null;

  return (
    <div className="bg-white border rounded-xl shadow-sm">
      <div className="px-5 py-4 border-b flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Car size={18} className="text-red-600" /> MVA Hotspots
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Motor-vehicle collisions by area, time &amp; weather
          </p>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-red-50 text-red-700 border-red-200">
          {s.mva_count?.toLocaleString()} MVAs · {s.mva_pct_of_calls}% of calls
        </span>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Kpi label="Top crash area" value={s.top_area || '—'} sub={`${(s.top_area_count ?? 0).toLocaleString()} MVAs`} Icon={Car} />
          <Kpi label="Peak hour" value={fmtHour(s.peak_hour)} Icon={Clock} />
          <Kpi label="Peak weekday" value={s.peak_weekday || '—'} Icon={CalendarDays} />
          <Kpi label="Worst weather" value={s.peak_weather ? (WEATHER_LABEL[s.peak_weather] || s.peak_weather) : '—'} Icon={CloudRain} />
        </div>

        {points.length > 0 && (
          <div>
            <TownshipMap center={data.center} points={points} color="#DC2626" />
            <p className="text-[11px] text-gray-500 mt-2"><span className="font-medium text-gray-600">Circle size = collision volume.</span> Red = MVA concentration by township.</p>
          </div>
        )}

        {weather.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Collisions per day by weather</p>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={weather} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v, n, p) => [`${v} / day`, `${p.payload.total_mvas} over ${p.payload.days} days`]} />
                <Bar dataKey="mvas_per_day" radius={[4, 4, 0, 0]}>
                  {weather.map((w) => <Cell key={w.condition} fill={clear && w.mvas_per_day > clear.mvas_per_day ? '#DC2626' : '#F59E0B'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {worst && clear && worst.condition !== 'clear' && (
              <p className="text-xs text-gray-500 mt-2">
                <span className="font-medium text-gray-700">{WEATHER_LABEL[worst.condition] || worst.condition}</span> days average
                <span className="font-medium text-red-600"> {worst.mvas_per_day} collisions/day</span> vs {clear.mvas_per_day} on clear days.
              </p>
            )}
          </div>
        )}

        {byHour.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Collisions by hour of day</p>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={byHour} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={2} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v) => [v, 'MVAs']} />
                <Bar dataKey="count" fill="#DC2626" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">Top collision areas</p>
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-[11px] uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2.5 text-left font-medium">#</th>
                  <th className="px-3 py-2.5 text-left font-medium">Area</th>
                  <th className="px-3 py-2.5 text-right font-medium">MVAs</th>
                  <th className="px-3 py-2.5 text-right font-medium">% of MVAs</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(data.top_areas || []).slice(0, 12).map((a, i) => (
                  <tr key={a.location} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-gray-700">
                      {a.location}{!a.mapped && <span className="ml-1 text-[10px] text-gray-400">(no map)</span>}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-900">{a.call_count.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-gray-500">{a.percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {data.warnings?.length > 0 && <p className="text-[11px] text-gray-400">{data.warnings.join(' ')}</p>}
        <p className="text-[11px] text-gray-400">Decision-support estimates from historical collisions + weather. Identifies "Motor Vehicle Collision" calls from the incident-type field.</p>
      </div>
    </div>
  );
}
