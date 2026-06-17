'use client';
import { useState, useEffect } from 'react';
import { UserMinus, Activity, AlertTriangle, Info, TrendingUp } from 'lucide-react';

async function apiFetch(path) {
  const res = await fetch(`/api/proxy${path}`, { credentials: 'include' });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || `HTTP ${res.status}`); }
  return res.json();
}

const LEVEL = {
  LOW:      { text: 'text-emerald-700', pill: 'bg-emerald-100 text-emerald-700 border-emerald-200', bar: 'bg-emerald-500' },
  MODERATE: { text: 'text-amber-700',   pill: 'bg-amber-100 text-amber-700 border-amber-200',       bar: 'bg-amber-500' },
  HIGH:     { text: 'text-orange-700',  pill: 'bg-orange-100 text-orange-700 border-orange-200',     bar: 'bg-orange-500' },
  CRITICAL: { text: 'text-red-700',     pill: 'bg-red-100 text-red-700 border-red-200',              bar: 'bg-red-500' },
};
const prettify = (k) => k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function Shell({ children }) {
  return (
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b flex items-center gap-2">
        <UserMinus size={18} className="text-rose-600" />
        <div>
          <h2 className="text-base font-semibold text-gray-900">Staffing Turnover Outlook</h2>
          <p className="text-xs text-gray-500 mt-0.5">Attrition risk from operational strain — burnout, stretched response, rising demand</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function TurnoverRisk({ uploadId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!uploadId) return;
    setLoading(true); setError(''); setData(null);
    apiFetch(`/data/uploads/${uploadId}/turnover`)
      .then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [uploadId]);

  if (loading) return (
    <Shell><div className="p-5 animate-pulse space-y-3"><div className="h-16 bg-gray-50 rounded" /><div className="h-24 bg-gray-50 rounded" /></div></Shell>
  );
  if (error) return (
    <Shell><div className="p-5 text-sm text-red-600 flex items-start gap-2"><AlertTriangle size={15} className="mt-0.5" /> {error}</div></Shell>
  );
  if (!data?.available) return (
    <Shell><div className="p-5 text-sm text-gray-500">{data?.reason || 'Turnover outlook unavailable.'}</div></Shell>
  );

  const si = data.stress_index || {};
  const lvl = LEVEL[si.level] || LEVEL.MODERATE;
  const comps = si.components || {};
  const ctx = data.context || {};
  const trained = data.method === 'trained_forecast';

  return (
    <Shell>
      <div className="p-5 space-y-5">
        {/* Composite index + level */}
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 text-center">
            <div className={`text-3xl font-bold ${lvl.text}`}>{Math.round(si.composite_index ?? 0)}</div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wide">index /100</div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${lvl.pill}`}>{si.level} RISK</span>
              <span className="text-[11px] text-gray-400 flex items-center gap-1"><Activity size={11} /> {data.method_label}</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden relative">
              <div className={`h-full ${lvl.bar} rounded-full`} style={{ width: `${Math.min(100, si.composite_index ?? 0)}%` }} />
              {/* threshold ticks at 40/55/70 */}
              {[40, 55, 70].map((t) => (
                <span key={t} className="absolute top-0 h-full w-px bg-white/70" style={{ left: `${t}%` }} />
              ))}
            </div>
            <div className="flex justify-between text-[9px] text-gray-300 mt-0.5"><span>Low</span><span>Moderate</span><span>High</span><span>Critical</span></div>
          </div>
        </div>

        {/* Drivers */}
        {data.drivers?.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">What's driving it</p>
            <ul className="space-y-1.5">
              {data.drivers.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${lvl.bar}`} />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Component breakdown */}
        {Object.keys(comps).length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Risk components</p>
            <div className="space-y-2">
              {Object.entries(comps).map(([key, c]) => (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-gray-700">{prettify(key)} {c.weight != null && <span className="text-gray-300">· {Math.round(c.weight * 100)}% wt</span>}</span>
                    <span className="text-gray-500">{Math.round(c.score ?? 0)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-400 rounded-full" style={{ width: `${Math.min(100, c.score ?? 0)}%` }} />
                  </div>
                  {c.detail && <p className="text-[10px] text-gray-400 mt-0.5">{c.detail}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trained forecast (only when HR separation history is provided) */}
        {trained && data.forecast?.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1.5">
              <TrendingUp size={12} /> Forecast — monthly separations
            </p>
            <div className="grid grid-cols-6 gap-1">
              {data.forecast.map((f) => (
                <div key={f.month} className="text-center" title={`${f.month}: ~${f.predicted} (${f.risk_level})`}>
                  <div className="h-12 flex items-end justify-center">
                    <div className="w-4 bg-rose-400 rounded-t" style={{ height: `${Math.min(100, (f.predicted / Math.max(1, ...data.forecast.map((x) => x.predicted))) * 100)}%` }} />
                  </div>
                  <div className="text-[9px] text-gray-600">{f.predicted}</div>
                  <div className="text-[8px] text-gray-400">{f.month.slice(5)}</div>
                </div>
              ))}
            </div>
            {data.model_metrics && (
              <p className="text-[10px] text-gray-400 mt-2">SBEMS Ridge model · MAE {data.model_metrics.mae} · R² {data.model_metrics.r2 ?? '—'}</p>
            )}
          </div>
        )}

        {/* HR-forecast hint (proxy mode) */}
        {!trained && data.hr_forecast && !data.hr_forecast.available && (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/60 px-3 py-2 text-xs text-gray-500 flex items-start gap-2">
            <Info size={13} className="mt-0.5 flex-shrink-0 text-gray-400" />
            {data.hr_forecast.reason}
          </div>
        )}

        <p className="text-[11px] text-gray-400 border-t pt-3">{data.note}</p>
      </div>
    </Shell>
  );
}
