'use client';
import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, RotateCcw, Loader2, Navigation } from 'lucide-react';

const StagingMap = dynamic(() => import('./StagingMap'), {
  ssr: false,
  loading: () => <div className="h-[400px] flex items-center justify-center text-sm text-gray-400 bg-gray-50 rounded-lg">Loading map…</div>,
});

async function apiFetch(path) {
  const res = await fetch(`/api/proxy${path}`, { credentials: 'include' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
  return res.json();
}

// Browser-local "now" defaults (backend keys), so the block/season match the viewer's timezone.
function localBlock() { const h = new Date().getHours(); return h < 6 ? 'overnight' : h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'; }
function localSeason() { const m = new Date().getMonth() + 1; return [12, 1, 2].includes(m) ? 'winter' : [3, 4, 5].includes(m) ? 'spring' : [6, 7, 8].includes(m) ? 'summer' : 'fall'; }

function Segmented({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o.key} type="button" onClick={() => onChange(o.key)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
            value === o.key ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-400'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function StagingRecommender({ uploadId, combined = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [ctrl, setCtrl] = useState({ block: localBlock(), season: localSeason(), weather: null, units: 3 });
  const [unitsDraft, setUnitsDraft] = useState(3);

  const base = combined ? '/data/combined-dashboard/staging' : (uploadId ? `/data/uploads/${uploadId}/staging` : null);

  const load = useCallback(async (c) => {
    if (!base) return;
    setLoading(true); setErr('');
    const qs = new URLSearchParams();
    if (c.block) qs.set('time_block', c.block);
    if (c.season) qs.set('season', c.season);
    if (c.weather) qs.set('weather', c.weather);
    qs.set('units', String(c.units));
    try {
      const d = await apiFetch(`${base}?${qs.toString()}`);
      setData(d);
      // Adopt the server's live-detected weather on first load (when the user hasn't picked one).
      if (d?.selected) {
        setCtrl((prev) => ({ ...prev, block: d.selected.block, season: d.selected.season, weather: prev.weather ?? d.selected.weather }));
      }
    } catch (e) {
      setErr(e.message || 'Failed to load staging recommendations');
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => { load({ block: localBlock(), season: localSeason(), weather: null, units: 3 }); }, [load]);

  const update = (patch) => { const c = { ...ctrl, ...patch }; setCtrl(c); load(c); };
  const resetToNow = () => {
    const c = { block: localBlock(), season: localSeason(), weather: (data?.current?.weather) || null, units: ctrl.units };
    setCtrl(c); load({ ...c, weather: null });   // omit weather -> backend re-detects live
  };

  if (!base) return null;

  const opts = data?.options;
  const sel = data?.selected;
  const rec = data?.recommended || [];

  return (
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b flex items-center gap-2">
        <Navigation size={16} className="text-blue-600" />
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Recommended Ambulance Staging</h2>
          <p className="text-xs text-gray-500">Where to post units for the selected conditions, from historical demand by area, time, season &amp; weather.</p>
        </div>
        {loading && <Loader2 size={15} className="animate-spin text-blue-500 ml-auto" />}
      </div>

      {err ? (
        <div className="p-6 text-sm text-red-600">{err}</div>
      ) : data && !data.available ? (
        <div className="p-6 text-sm text-gray-500">{data.reason || 'Staging recommendations are not available for this dataset.'}</div>
      ) : (
        <div className="p-5 space-y-5">
          {/* Controls */}
          {opts && (
            <div className="space-y-3">
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Time of day</p>
                  <Segmented options={opts.blocks} value={sel?.block} onChange={(v) => update({ block: v })} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Season</p>
                  <Segmented options={opts.seasons} value={sel?.season} onChange={(v) => update({ season: v })} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Weather</p>
                  <Segmented options={opts.weather} value={sel?.weather} onChange={(v) => update({ weather: v })} />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="font-semibold uppercase tracking-wide text-gray-400 text-[11px]">Units</span>
                  <input type="range" min="1" max="6" value={unitsDraft}
                    onChange={(e) => setUnitsDraft(Number(e.target.value))}
                    onMouseUp={(e) => update({ units: Number(e.target.value) })}
                    onKeyUp={(e) => update({ units: Number(e.target.value) })}
                    onTouchEnd={(e) => update({ units: Number(e.target.value) })}
                    className="accent-blue-600" />
                  <span className="font-bold text-gray-900 w-4 text-center">{unitsDraft}</span>
                </label>
                <button type="button" onClick={resetToNow}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium">
                  <RotateCcw size={12} /> Reset to now
                </button>
                {data?.current && (
                  <span className="text-[11px] text-gray-400">
                    Now: {opts.blocks.find((b) => b.key === data.current.block)?.label} · {opts.seasons.find((s) => s.key === data.current.season)?.label}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Summary line */}
          {sel && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              <span className="font-semibold text-blue-700">{sel.block_label} · {sel.season_label} · {sel.weather_label}</span>
              {data.expected_calls_per_day != null && <span className="text-blue-600">~{data.expected_calls_per_day} calls expected</span>}
              <span className="text-gray-500">{Number(data.sample_calls || 0).toLocaleString()} matching historical calls</span>
              {data.method === 'gps' && (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold"><Navigation size={11} /> GPS-optimized · {Number(data.gps_points || 0).toLocaleString()} located calls</span>
              )}
              {data.method !== 'gps' && data.post_location_source === 'referring_gps' && (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold"><Navigation size={11} /> On referring coordinates</span>
              )}
              {data.method !== 'gps' && data.coordinate_calls != null && (
                data.coordinate_calls > 0
                  ? <span className="text-emerald-600">{Number(data.coordinate_calls).toLocaleString()} calls with coordinates</span>
                  : <span className="text-amber-600">no coordinate data in this dataset — upload an export with Referring Latitude/Longitude</span>
              )}
              {sel.weather && sel.weather !== 'any' && !sel.weather_used && (
                <span className="text-amber-600">weather pattern too sparse — using typical</span>
              )}
            </div>
          )}
          {data?.note && <p className="text-xs text-amber-600 -mt-2">{data.note}</p>}

          <div className="grid lg:grid-cols-3 gap-5">
            {/* Ranked posts */}
            <div className="lg:col-span-1 space-y-2">
              <p className="text-xs font-semibold text-gray-700">Post these units</p>
              {rec.length === 0 && <p className="text-xs text-gray-400">No mappable locations for these conditions.</p>}
              {rec.map((r) => (
                <div key={r.area} className="flex items-center gap-3 border rounded-lg px-3 py-2">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{r.rank}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{r.area}</p>
                    {r.cross_street && (
                      <p className="text-[11px] text-emerald-700 truncate" title={r.cross_street}>near {r.cross_street}</p>
                    )}
                    <p className="text-xs text-gray-500">{r.share}% of expected calls · {r.calls} historical</p>
                  </div>
                </div>
              ))}
              {rec.length > 0 && (
                <p className="text-[11px] text-gray-400 flex items-start gap-1 pt-1">
                  <MapPin size={11} className="mt-0.5 flex-shrink-0" />
                  {data.method === 'gps'
                    ? 'Optimal staging points clustered from the actual call GPS — nearest road shown; a human sets the exact post.'
                    : data.post_location_source === 'referring_gps'
                    ? 'Posts placed on each area’s referring-coordinate demand center (nearest road shown), independent of the selected season.'
                    : 'Ranked by predicted demand and spread for coverage. Locations are municipality centroids.'}
                </p>
              )}
            </div>
            {/* Map */}
            <div className="lg:col-span-2">
              {data?.center && <StagingMap center={data.center} recommended={rec} others={data.areas || []} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
