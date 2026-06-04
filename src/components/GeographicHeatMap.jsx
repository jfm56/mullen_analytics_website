'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const TownshipMap = dynamic(() => import('./TownshipMap'), {
  ssr: false,
  loading: () => <div className="h-[380px] bg-gray-50 rounded-lg animate-pulse" />,
});

async function apiFetch(path) {
  const res = await fetch(`/api/proxy${path}`, { credentials: 'include' });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || `HTTP ${res.status}`); }
  return res.json();
}

function Kpi({ label, value }) {
  return (
    <div className="border rounded-lg p-3 bg-gray-50/60">
      <div className="text-[11px] text-gray-500 mb-1">{label}</div>
      <div className="text-lg font-bold text-gray-900 truncate">{value}</div>
    </div>
  );
}

const TREND = {
  rising:  { Icon: TrendingUp,   cls: 'text-red-600',  label: 'Rising' },
  falling: { Icon: TrendingDown, cls: 'text-blue-600', label: 'Falling' },
  stable:  { Icon: Minus,        cls: 'text-gray-400', label: 'Stable' },
};

export default function GeographicHeatMap({ uploadId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!uploadId) return;
    setLoading(true); setError(''); setData(null);
    apiFetch(`/data/uploads/${uploadId}/geographic`)
      .then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [uploadId]);

  if (loading) return (
    <div className="bg-white border rounded-xl p-6 animate-pulse space-y-3">
      <div className="h-5 w-44 bg-gray-100 rounded" />
      <div className="h-72 bg-gray-50 rounded" />
    </div>
  );
  if (error) return (
    <div className="bg-white border rounded-xl p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2"><MapPin size={18} /> Geographic Hotspots</h2>
      <p className="text-sm text-red-600">{error}</p>
    </div>
  );
  if (!data?.available) return (
    <div className="bg-white border rounded-xl p-8 text-center">
      <MapPin size={26} className="mx-auto text-gray-300 mb-2" />
      <h2 className="text-base font-semibold text-gray-900 mb-1">Geographic Hotspots</h2>
      <p className="text-sm text-gray-500 max-w-md mx-auto">{data?.reason || 'No geographic data detected for this upload.'}</p>
    </div>
  );

  const s = data.summary || {};
  const points = data.map_points || [];

  return (
    <div className="bg-white border rounded-xl shadow-sm">
      <div className="px-5 py-4 border-b flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <MapPin size={18} className="text-blue-600" /> Geographic Hotspots
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Call volume by township · {s.location_coverage_percent}% of calls located
          </p>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
          {s.unique_locations} areas · {s.mapped_locations} mapped
        </span>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Kpi label="Top area" value={s.top_location || '—'} />
          <Kpi label="Top-area calls" value={(s.top_location_calls ?? 0).toLocaleString()} />
          <Kpi label="Located calls" value={`${s.location_coverage_percent}%`} />
          <Kpi label="Distinct areas" value={s.unique_locations ?? '—'} />
        </div>

        {points.length > 0 && (
          <div>
            <TownshipMap center={data.center} points={points} />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-gray-500">
              <span className="font-medium text-gray-600">Circle size = call volume.</span>
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#DC2626' }} /> Rising</span>
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#0EA5E9' }} /> Stable</span>
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#2563EB' }} /> Falling</span>
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">Top areas by call volume (with near-term projection)</p>
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-[11px] uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2.5 text-left font-medium">#</th>
                  <th className="px-3 py-2.5 text-left font-medium">Area</th>
                  <th className="px-3 py-2.5 text-right font-medium">Calls</th>
                  <th className="px-3 py-2.5 text-right font-medium">% </th>
                  <th className="px-3 py-2.5 text-center font-medium">Trend</th>
                  <th className="px-3 py-2.5 text-right font-medium">Proj. / 30d</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(data.location_volume || []).slice(0, 15).map((r, i) => {
                  const t = TREND[r.trend] || TREND.stable;
                  return (
                    <tr key={r.location} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2 font-medium text-gray-700">
                        {r.location}{!r.mapped && <span className="ml-1 text-[10px] text-gray-400">(no map)</span>}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600">{r.call_count.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-gray-500">{r.percent}%</td>
                      <td className="px-3 py-2">
                        <span className={`flex items-center justify-center gap-1 ${t.cls}`}>
                          <t.Icon size={13} /> <span className="text-[11px]">{t.label}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600">{r.projected_30d ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {data.warnings?.length > 0 && (
          <p className="text-[11px] text-gray-400">{data.warnings.join(' ')}</p>
        )}
      </div>
    </div>
  );
}
