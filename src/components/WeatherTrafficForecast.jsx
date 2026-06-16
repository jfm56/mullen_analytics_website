'use client';
import { useState, useEffect } from 'react';
import {
  CloudRain, TrendingUp, MapPin, Car, AlertTriangle, CalendarClock, Thermometer,
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
} from 'recharts';

async function apiFetch(path) {
  const res = await fetch(`/api/proxy${path}`, { credentials: 'include' });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || `HTTP ${res.status}`); }
  return res.json();
}

const CONDITION_LABEL = {
  snow: 'Snow', ice: 'Ice', heavy_rain: 'Heavy rain', rain: 'Rain',
  wind: 'Wind', extreme_heat: 'Extreme heat', cold: 'Cold', clear: 'Clear',
};

function Kpi({ label, value, Icon, sub }) {
  return (
    <div className="border rounded-lg p-3 bg-gray-50/60">
      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1">{Icon && <Icon size={12} />} {label}</div>
      <div className="text-lg font-bold text-gray-900 truncate">{value}</div>
      {sub && <div className="text-[11px] text-gray-400 mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

function DailyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  return (
    <div className="bg-white border rounded-lg shadow-sm px-3 py-2 text-xs">
      <p className="font-semibold text-gray-800">{row.weekday} {label}</p>
      <p className="text-blue-600">~{row.predicted} calls <span className="text-gray-400">({row.lower}–{row.upper})</span></p>
      {row.condition && (
        <p className="text-gray-500 mt-0.5">
          {CONDITION_LABEL[row.condition] || row.condition}
          {row.temp != null ? ` · ${Math.round(row.temp)}°F` : ''}
          {row.precip ? ` · ${row.precip}″ precip` : ''}
        </p>
      )}
    </div>
  );
}

export default function WeatherTrafficForecast({ uploadId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!uploadId) return;
    setLoading(true); setError(''); setData(null);
    apiFetch(`/data/uploads/${uploadId}/forecast/weather-traffic?horizon=14`)
      .then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [uploadId]);

  if (loading) return (
    <div className="bg-white border rounded-xl p-6 animate-pulse space-y-3">
      <div className="h-5 w-56 bg-gray-100 rounded" />
      <div className="h-64 bg-gray-50 rounded" />
    </div>
  );
  if (error) return (
    <div className="bg-white border rounded-xl p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2"><CloudRain size={18} /> Weather &amp; Traffic Forecast</h2>
      <p className="text-sm text-red-600">{error}</p>
    </div>
  );
  if (!data?.available) return (
    <div className="bg-white border rounded-xl p-8 text-center">
      <CloudRain size={26} className="mx-auto text-gray-300 mb-2" />
      <h2 className="text-base font-semibold text-gray-900 mb-1">Weather &amp; Traffic Forecast</h2>
      <p className="text-sm text-gray-500">{data?.reason || 'Not enough data to generate a day-level forecast yet.'}</p>
    </div>
  );

  const ctx = data.context || {};
  const daily = (data.daily_forecast || []).map((d) => ({
    label: d.date.slice(5), weekday: d.weekday, predicted: d.predicted_calls,
    lower: d.lower, upper: d.upper, condition: d.condition, temp: d.temp_max_f, precip: d.precip_in,
  }));
  const busiest = (data.daily_forecast || []).reduce((b, d) => (d.predicted_calls > (b?.predicted_calls ?? -1) ? d : b), null);
  const impact = (data.weather_impact?.by_condition || []).map((c) => ({
    name: CONDITION_LABEL[c.condition] || c.condition, delta: c.delta_pct, avg: c.avg_calls, days: c.days,
  }));
  const topDriver = impact.length ? impact[0] : null;
  const areas = data.by_area || [];
  const maxAreaTotal = Math.max(1, ...areas.map((a) => a.predicted_total));
  const trafficOn = data.traffic?.available;

  return (
    <div className="bg-white border rounded-xl shadow-sm">
      <div className="px-5 py-4 border-b flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <CloudRain size={18} className="text-blue-600" /> Weather &amp; Traffic Forecast
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Next {data.horizon_days} days by day &amp; area · {ctx.total_calls?.toLocaleString()} calls,
            {' '}{ctx.history_start} → {ctx.history_end}
            {ctx.model_name ? ` · model: ${ctx.model_name}` : ''}
            {ctx.weather_source ? ` · weather: ${ctx.weather_source}` : ' · weather unavailable'}
          </p>
        </div>
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

      <div className="p-5 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Kpi label={`Calls next ${data.horizon_days}d`} value={Math.round(data.horizon_total).toLocaleString()} Icon={CalendarClock} />
          <Kpi label="Busiest day ahead" value={busiest ? `${Math.round(busiest.predicted_calls)} calls` : '—'}
               Icon={TrendingUp} sub={busiest ? `${busiest.weekday} ${busiest.date.slice(5)}` : null} />
          <Kpi label="Biggest weather driver" value={topDriver ? topDriver.name : '—'} Icon={Thermometer}
               sub={topDriver && topDriver.delta != null ? `${topDriver.delta > 0 ? '+' : ''}${topDriver.delta}% vs avg` : null} />
          <Kpi label="Areas covered" value={ctx.areas_total ?? areas.length} Icon={MapPin}
               sub={`${ctx.areas_mapped ?? 0} mapped`} />
        </div>

        {/* Daily forecast with band */}
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">Predicted daily call volume (80% range)</p>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={daily} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip content={<DailyTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="upper" stroke="#93C5FD" strokeWidth={1} strokeDasharray="2 3" dot={false} name="Upper" />
                <Line type="monotone" dataKey="lower" stroke="#93C5FD" strokeWidth={1} strokeDasharray="2 3" dot={false} name="Lower" />
                <Line type="monotone" dataKey="predicted" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 2 }} name="Predicted" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weather impact + By area */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">
              Weather impact on demand
              {data.weather_impact?.baseline_avg != null && (
                <span className="font-normal text-gray-400"> · baseline {data.weather_impact.baseline_avg}/day</span>
              )}
            </p>
            {impact.length === 0 ? (
              <p className="text-xs text-gray-400 py-8 text-center">Weather impact unavailable.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={impact} layout="vertical" margin={{ top: 5, right: 24, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 10 }} unit="%" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={78} />
                  <Tooltip formatter={(v, n, p) => [`${v > 0 ? '+' : ''}${v}% (${p.payload.avg}/day, ${p.payload.days} days)`, 'vs baseline']}
                           contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Bar dataKey="delta" radius={[0, 3, 3, 0]}>
                    {impact.map((d, i) => <Cell key={i} fill={d.delta >= 0 ? '#ef4444' : '#16a34a'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            <p className="text-[11px] text-gray-400 mt-1">Red = more calls than average, green = fewer.</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
              <MapPin size={12} /> Predicted volume by area ({data.horizon_days}d)
            </p>
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
              {areas.slice(0, 12).map((a) => (
                <div key={a.area}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-gray-700 truncate flex items-center gap-1">
                      {a.area}
                      {!a.mapped && <span className="text-[10px] text-gray-300">(no map)</span>}
                      {a.congestion_factor != null && (
                        <span className="text-[10px] text-orange-500 flex items-center gap-0.5"><Car size={9} />{a.congestion_factor}×</span>
                      )}
                    </span>
                    <span className="text-gray-500 whitespace-nowrap">{Math.round(a.predicted_total)} · {a.share_pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(a.predicted_total / maxAreaTotal) * 100}%` }} />
                  </div>
                </div>
              ))}
              {areas.length === 0 && <p className="text-xs text-gray-400 py-6 text-center">No mappable area column detected.</p>}
            </div>
          </div>
        </div>

        {/* Traffic status */}
        <div className={`rounded-lg border px-3 py-2 text-xs flex items-start gap-2 ${trafficOn ? 'border-orange-200 bg-orange-50 text-orange-800' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
          <Car size={13} className="mt-0.5 flex-shrink-0" />
          {trafficOn
            ? <span>Live traffic congestion is overlaid per area (× = typical-traffic delay vs free-flow), via {data.traffic.provider}.</span>
            : <span>{data.traffic?.note || 'Traffic congestion overlay is off. Weather drives the daily forecast; enable Google Routes for per-area congestion.'}</span>}
        </div>
      </div>
    </div>
  );
}
