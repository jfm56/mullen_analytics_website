'use client';

/**
 * CompareMode
 * Side-by-side comparison of two filter groups with diff metrics and charts.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import CHART from '@/lib/chartTheme';
import { dashboardFilter } from '@/lib/api';


const COLORS = { a: CHART.series[0], b: CHART.series[1] };
const COMPARE_TYPES = [
  { value: 'unit', label: 'Unit vs Unit' },
  { value: 'municipality', label: 'Municipality vs Municipality' },
  { value: 'time_period', label: 'Time Period vs Time Period' },
  { value: 'call_category', label: 'Emergency vs Interfacility' },
  { value: 'custom', label: 'Custom Filters' },
];

// ─── Diff card ───────────────────────────────────────────────────────────────
function DiffCard({ label, a, b, diff, pct, unit = '' }) {
  if (a == null && b == null) return null;
  const positive = diff > 0;
  return (
    <div className="bg-white border rounded-lg p-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className="flex items-end gap-3">
        <div>
          <p className="text-xs text-blue-500 font-medium mb-0.5">Group A</p>
          <p className="text-lg font-bold text-gray-900">{a != null ? `${a}${unit}` : '—'}</p>
        </div>
        <div className="text-gray-300 text-lg pb-1">→</div>
        <div>
          <p className="text-xs text-emerald-500 font-medium mb-0.5">Group B</p>
          <p className="text-lg font-bold text-gray-900">{b != null ? `${b}${unit}` : '—'}</p>
        </div>
        {diff != null && (
          <div className="ml-auto text-right">
            <p className={`text-sm font-semibold ${positive ? 'text-red-500' : 'text-green-500'}`}>
              {positive ? '+' : ''}{diff}{unit}
            </p>
            {pct != null && (
              <p className={`text-xs ${positive ? 'text-red-400' : 'text-green-400'}`}>
                {positive ? '+' : ''}{pct}%
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Side-by-side bar chart ──────────────────────────────────────────────────
function SideBySideChart({ dataA, dataB, labelKey = 'label', valueKey = 'count', groupLabelA, groupLabelB, title }) {
  if (!Array.isArray(dataA) || !Array.isArray(dataB)) return null;

  const allKeys = [...new Set([
    ...dataA.map(d => d[labelKey]),
    ...dataB.map(d => d[labelKey]),
  ])].slice(0, 20);

  const merged = allKeys.map(k => ({
    name: k,
    [groupLabelA]: dataA.find(d => d[labelKey] === k)?.[valueKey] || 0,
    [groupLabelB]: dataB.find(d => d[labelKey] === k)?.[valueKey] || 0,
  }));

  return (
    <div className="bg-white border rounded-lg p-4">
      <p className="text-xs font-semibold text-gray-600 mb-3">{title}</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={merged} margin={{ top: 5, right: 10, left: 0, bottom: 50 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" interval={0} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey={groupLabelA} fill={COLORS.a} />
          <Bar dataKey={groupLabelB} fill={COLORS.b} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Overlay line chart ───────────────────────────────────────────────────────
function OverlayLineChart({ dataA, dataB, xKey, yKey, groupLabelA, groupLabelB, title }) {
  if (!Array.isArray(dataA) || !Array.isArray(dataB)) return null;

  const allX = [...new Set([...dataA.map(d => d[xKey]), ...dataB.map(d => d[xKey])])].sort();
  const merged = allX.map(x => ({
    x,
    [groupLabelA]: dataA.find(d => d[xKey] === x)?.[yKey] ?? null,
    [groupLabelB]: dataB.find(d => d[xKey] === x)?.[yKey] ?? null,
  }));

  return (
    <div className="bg-white border rounded-lg p-4">
      <p className="text-xs font-semibold text-gray-600 mb-3">{title}</p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={merged} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="x" tick={{ fontSize: 9 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Line type="monotone" dataKey={groupLabelA} stroke={COLORS.a} dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey={groupLabelB} stroke={COLORS.b} dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Quick-build filters based on compare type ───────────────────────────────
function FilterBuilder({ compareType, opts, optsLoading, onOpenMapping, group, onChange }) {
  const f = group.filters;
  const set = (key, val) => onChange({ ...group, filters: { ...f, [key]: val } });
  const setLabel = (val) => onChange({ ...group, label: val });

  const unitOpts = opts?.units || [];
  const muniOpts = opts?.municipalities || [];

  if (compareType === 'unit') {
    return (
      <div className="space-y-2">
        <input value={group.label} onChange={e => setLabel(e.target.value)}
          placeholder="Label (e.g. M62)" className="w-full border rounded px-2 py-1.5 text-xs" />
        {optsLoading ? (
          <p className="text-xs text-gray-400 italic">Loading units…</p>
        ) : unitOpts.length === 0 ? (
          <div className="space-y-1">
            <p className="text-xs text-amber-600">No units found. Set Analytics Fields first.</p>
            {onOpenMapping && (
              <button
                onClick={onOpenMapping}
                className="text-xs text-blue-600 underline hover:text-blue-800"
              >
                ⚙ Set Analytics Fields
              </button>
            )}
          </div>
        ) : (
          <select value={f.units?.[0] || ''} onChange={e => set('units', e.target.value ? [e.target.value] : [])}
            className="w-full border rounded px-2 py-1.5 text-xs">
            <option value="">— Select unit —</option>
            {unitOpts.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        )}
      </div>
    );
  }
  if (compareType === 'municipality') {
    return (
      <div className="space-y-2">
        <input value={group.label} onChange={e => setLabel(e.target.value)}
          placeholder="Label (e.g. Camden)" className="w-full border rounded px-2 py-1.5 text-xs" />
        {optsLoading ? (
          <p className="text-xs text-gray-400 italic">Loading municipalities…</p>
        ) : muniOpts.length === 0 ? (
          <div className="space-y-1">
            <p className="text-xs text-amber-600">No municipalities found. Set Analytics Fields first.</p>
            {onOpenMapping && (
              <button
                onClick={onOpenMapping}
                className="text-xs text-blue-600 underline hover:text-blue-800"
              >
                ⚙ Set Analytics Fields
              </button>
            )}
          </div>
        ) : (
          <select value={f.municipalities?.[0] || ''} onChange={e => set('municipalities', e.target.value ? [e.target.value] : [])}
            className="w-full border rounded px-2 py-1.5 text-xs">
            <option value="">— Select municipality —</option>
            {muniOpts.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
      </div>
    );
  }
  if (compareType === 'time_period') {
    return (
      <div className="space-y-2">
        <input value={group.label} onChange={e => setLabel(e.target.value)}
          placeholder="Label (e.g. Jan–Jun 2024)" className="w-full border rounded px-2 py-1.5 text-xs" />
        <div className="flex gap-1 items-center">
          <input type="date" value={f.date_range?.[0] || ''} onChange={e => set('date_range', [e.target.value, f.date_range?.[1] || ''])}
            className="border rounded px-1.5 py-1 text-xs flex-1" />
          <span className="text-xs text-gray-400">–</span>
          <input type="date" value={f.date_range?.[1] || ''} onChange={e => set('date_range', [f.date_range?.[0] || '', e.target.value])}
            className="border rounded px-1.5 py-1 text-xs flex-1" />
        </div>
      </div>
    );
  }
  if (compareType === 'call_category') {
    return (
      <div className="space-y-2">
        <p className="text-xs text-gray-500 italic">Fixed: Group A = Emergency, Group B = Interfacility</p>
      </div>
    );
  }
  // Custom
  return (
    <div className="space-y-2">
      <input value={group.label} onChange={e => setLabel(e.target.value)}
        placeholder="Label" className="w-full border rounded px-2 py-1.5 text-xs" />
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input type="checkbox" checked={f.exclude_interfacility || false}
          onChange={e => set('exclude_interfacility', e.target.checked)} />
        Exclude interfacility
      </label>
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input type="checkbox" checked={f.emergency_only || false}
          onChange={e => set('emergency_only', e.target.checked)} />
        Emergency only
      </label>
    </div>
  );
}

// ─── Main CompareMode ─────────────────────────────────────────────────────────
export default function CompareMode({ uploadId, onClose, onOpenMapping }) {
  const [compareType, setCompareType] = useState('unit');
  const [groupA, setGroupA] = useState({ label: 'Group A', filters: {} });
  const [groupB, setGroupB] = useState({ label: 'Group B', filters: {} });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterOpts, setFilterOpts] = useState(null);
  const [optsLoading, setOptsLoading] = useState(false);

  useEffect(() => {
    if (!uploadId) return;
    let cancelled = false;
    setOptsLoading(true);
    dashboardFilter.getFilterOptions(uploadId)
      .then(r => { if (!cancelled) setFilterOpts(r); })
      .catch(e => console.error('compare filter-options error', e))
      .finally(() => { if (!cancelled) setOptsLoading(false); });
    return () => { cancelled = true; };
  }, [uploadId]);

  const buildGroups = () => {
    if (compareType === 'call_category') {
      return {
        group_a: { label: 'Emergency', filters: { emergency_only: true } },
        group_b: { label: 'Interfacility', filters: { emergency_only: false, ift_only: true } },
      };
    }
    return { group_a: groupA, group_b: groupB };
  };

  const run = async () => {
    setLoading(true); setError('');
    try {
      const body = buildGroups();
      const res = await dashboardFilter.compare(uploadId, body);
      if (res.error) throw new Error(res.error);
      setResult(res);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const ga = result?.group_a;
  const gb = result?.group_b;
  const diff = result?.diff;

  const labelA = ga?.label || groupA.label;
  const labelB = gb?.label || groupB.label;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b bg-indigo-50">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-indigo-800">⇄ Compare Mode</span>
          <select value={compareType} onChange={e => setCompareType(e.target.value)}
            className="text-xs border rounded px-2 py-1 bg-white focus:outline-none">
            {COMPARE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <button onClick={onClose} className="text-indigo-400 hover:text-indigo-700 text-lg">✕</button>
      </div>

      {/* Group config */}
      {compareType !== 'call_category' && (
        <div className="grid grid-cols-2 gap-4 px-5 py-4 border-b bg-gray-50">
          <div>
            <p className="text-xs font-semibold text-blue-600 mb-2">Group A</p>
            <FilterBuilder compareType={compareType} opts={filterOpts} optsLoading={optsLoading} onOpenMapping={onOpenMapping} group={groupA} onChange={setGroupA} />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-600 mb-2">Group B</p>
            <FilterBuilder compareType={compareType} opts={filterOpts} optsLoading={optsLoading} onOpenMapping={onOpenMapping} group={groupB} onChange={setGroupB} />
          </div>
        </div>
      )}
      {compareType === 'call_category' && (
        <div className="px-5 py-3 border-b bg-gray-50 text-xs text-gray-500 italic">
          Compares all emergency calls vs all interfacility transports detected in this upload.
        </div>
      )}

      <div className="px-5 py-3 border-b flex items-center gap-3">
        <button onClick={run} disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-medium px-4 py-1.5 rounded">
          {loading ? 'Comparing…' : 'Run Comparison'}
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      {/* Results */}
      {result && (
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Diff summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <DiffCard
              label="Total Dispatched Calls"
              a={diff?.calls?.group_a}
              b={diff?.calls?.group_b}
              diff={diff?.calls?.difference}
              pct={diff?.calls?.pct_change}
            />
            <DiffCard
              label="Median Response Time"
              a={diff?.response_time_median?.group_a}
              b={diff?.response_time_median?.group_b}
              diff={diff?.response_time_median?.difference != null ? Math.round(diff.response_time_median.difference * 10) / 10 : null}
              pct={diff?.response_time_median?.pct_change}
              unit=" min"
            />
            <DiffCard
              label="P90 Response Time"
              a={diff?.response_time_p90?.group_a}
              b={diff?.response_time_p90?.group_b}
              diff={diff?.response_time_p90?.difference != null ? Math.round(diff.response_time_p90.difference * 10) / 10 : null}
              pct={diff?.response_time_p90?.pct_change}
              unit=" min"
            />
          </div>

          {/* Summary row */}
          <div className="grid grid-cols-2 gap-4">
            {[ga, gb].map((g, idx) => (
              <div key={idx} className={`rounded-lg border p-3 ${idx === 0 ? 'border-blue-200 bg-blue-50' : 'border-emerald-200 bg-emerald-50'}`}>
                <p className={`text-xs font-bold mb-2 ${idx === 0 ? 'text-blue-700' : 'text-emerald-700'}`}>{g.label}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-gray-500">Total calls</span>
                  <span className="font-medium">{g.call_volume?.total?.toLocaleString()}</span>
                  <span className="text-gray-500">Method</span>
                  <span className="font-medium">{g.call_volume?.method?.replace(/_/g, ' ')}</span>
                  <span className="text-gray-500">IFT rows</span>
                  <span className="font-medium">{g.interfacility_count?.toLocaleString()}</span>
                  {g.response_times?.available && <>
                    <span className="text-gray-500">Median RT</span>
                    <span className="font-medium">{g.response_times.median_minutes} min</span>
                    <span className="text-gray-500">P90 RT</span>
                    <span className="font-medium">{g.response_times.p90_minutes} min</span>
                  </>}
                  <span className="text-gray-500">Busiest hour</span>
                  <span className="font-medium">{g.busiest_hour != null ? `${g.busiest_hour}:00` : '—'}</span>
                  <span className="text-gray-500">Top call type</span>
                  <span className="font-medium truncate">{g.top_call_type || '—'}</span>
                </div>
                {g.filters_applied?.length > 0 && (
                  <p className="text-[10px] text-gray-400 mt-2">{g.filters_applied.join(' · ')}</p>
                )}
              </div>
            ))}
          </div>

          {/* Calls by hour overlay */}
          <OverlayLineChart
            dataA={Array.isArray(ga.by_hour) ? ga.by_hour : []}
            dataB={Array.isArray(gb.by_hour) ? gb.by_hour : []}
            xKey="hour" yKey="count"
            groupLabelA={labelA} groupLabelB={labelB}
            title="Calls by Hour"
          />

          {/* Calls by municipality side-by-side */}
          <SideBySideChart
            dataA={Array.isArray(ga.by_municipality) ? ga.by_municipality : []}
            dataB={Array.isArray(gb.by_municipality) ? gb.by_municipality : []}
            labelKey="label" valueKey="count"
            groupLabelA={labelA} groupLabelB={labelB}
            title="Calls by Municipality"
          />

          {/* Calls by unit side-by-side */}
          <SideBySideChart
            dataA={Array.isArray(ga.by_unit) ? ga.by_unit : []}
            dataB={Array.isArray(gb.by_unit) ? gb.by_unit : []}
            labelKey="label" valueKey="count"
            groupLabelA={labelA} groupLabelB={labelB}
            title="Calls by Unit"
          />

          {/* Calls by call type */}
          <SideBySideChart
            dataA={Array.isArray(ga.by_call_type) ? ga.by_call_type : []}
            dataB={Array.isArray(gb.by_call_type) ? gb.by_call_type : []}
            labelKey="label" valueKey="count"
            groupLabelA={labelA} groupLabelB={labelB}
            title="Calls by Type"
          />
        </div>
      )}
    </div>
  );
}
