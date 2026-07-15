'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { dateRange } from '@/lib/api';
import CHART from '@/lib/chartTheme';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
} from 'recharts';
import {
  CalendarRange, Plus, X, RefreshCw, TrendingUp, TrendingDown,
  Layers, AlertTriangle, Play, Info,
} from 'lucide-react';

// ── formatters ──────────────────────────────────────────────────────────────
const fmtMin = (n) => {
  if (n == null) return '—';
  const m = Math.floor(n); const s = Math.round((n - m) * 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};
const fmtNum = (n) => (n == null ? '—' : Number(n).toLocaleString());
const get = (o, path) => path.split('.').reduce((a, k) => (a == null ? null : a[k]), o);

// Metrics shown in the comparison table (path into a window's `metrics`).
const METRICS = [
  { label: 'Total Calls',              path: 'call_volume.total_calls',      lower: false },
  { label: 'Avg Calls / Day',          path: 'call_volume.avg_calls_per_day', lower: false },
  { label: 'Emergency Calls',          path: 'call_volume.emergency_calls',  lower: false },
  { label: 'Interfacility (IFT)',      path: 'call_volume.interfacility_calls', lower: false },
  { label: 'Busiest Weekday',          path: 'call_volume.busiest_day_of_week', text: true },
  { label: 'Response — Median',        path: 'response_times.median_minutes', lower: true, min: true },
  { label: 'Response — P90',           path: 'response_times.p90_minutes',    lower: true, min: true },
  { label: 'Dispatch → On-scene Median', path: 'response_times.intervals.dispatch_to_arrival.median_minutes', lower: true, min: true },
  { label: 'Dispatch → On-scene P90',  path: 'response_times.intervals.dispatch_to_arrival.p90_minutes',    lower: true, min: true },
];

const winColor = (i) => CHART.series[i % CHART.series.length];

// ── window row editor ───────────────────────────────────────────────────────
function WindowRow({ win, index, bounds, onChange, onRemove, canRemove }) {
  return (
    <div className="flex flex-wrap items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: winColor(index) }} />
      <input
        value={win.label}
        onChange={(e) => onChange({ ...win, label: e.target.value })}
        placeholder={`Range ${String.fromCharCode(65 + index)}`}
        className="w-28 text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <span className="text-xs font-semibold text-gray-400">FROM</span>
      <input
        type="date" value={win.from}        onChange={(e) => onChange({ ...win, from: e.target.value })}
        className="text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <span className="text-xs font-semibold text-gray-400">TO</span>
      <input
        type="date" value={win.to}        onChange={(e) => onChange({ ...win, to: e.target.value })}
        className="text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      {canRemove && (
        <button onClick={onRemove} className="ml-auto text-gray-400 hover:text-red-500" title="Remove range">
          <X size={15} />
        </button>
      )}
    </div>
  );
}

// ── comparison charts ───────────────────────────────────────────────────────
function ResultCharts({ windows }) {
  const valid = windows.filter((w) => w.metrics);
  if (valid.length === 0) return null;

  const volumeData = valid.map((w) => ({
    name: w.label,
    Emergency: get(w.metrics, 'call_volume.emergency_calls') || 0,
    IFT: get(w.metrics, 'call_volume.interfacility_calls') || 0,
  }));
  const rtData = valid.map((w) => ({
    name: w.label,
    Median: get(w.metrics, 'response_times.median_minutes'),
    P90: get(w.metrics, 'response_times.p90_minutes'),
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white border rounded-xl p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Call volume by range</h4>
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={volumeData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
            <XAxis dataKey="name" tick={CHART.tick} />
            <YAxis tick={CHART.tick} width={40} />
            <Tooltip contentStyle={CHART.tooltip} cursor={{ fill: 'rgba(0,0,0,0.03)' }} formatter={(v) => v.toLocaleString()} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Emergency" fill={CHART.primary} radius={[4, 4, 0, 0]} maxBarSize={48} />
            <Bar dataKey="IFT" fill={CHART.warn} radius={[4, 4, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white border rounded-xl p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Response time by range <span className="text-xs font-normal text-gray-400">(min · en route → on-scene)</span></h4>
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={rtData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
            <XAxis dataKey="name" tick={CHART.tick} />
            <YAxis tick={CHART.tick} width={40} tickFormatter={(v) => `${v}m`} />
            <Tooltip contentStyle={CHART.tooltip} cursor={{ fill: 'rgba(0,0,0,0.03)' }} formatter={(v, n) => [fmtMin(v), n]} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Median" fill={CHART.primary} radius={[4, 4, 0, 0]} maxBarSize={48} />
            <Bar dataKey="P90" fill={CHART.accent} radius={[4, 4, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── comparison table ────────────────────────────────────────────────────────
function ResultTable({ windows }) {
  const fmtCell = (m, val) => {
    if (m.text) return val ?? '—';
    if (m.min) return fmtMin(val);
    return fmtNum(val);
  };
  const base = windows[0];
  return (
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-[11px] uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3 text-left font-medium">Metric</th>
              {windows.map((w, i) => (
                <th key={i} className="px-4 py-3 text-right font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: winColor(i) }} />
                    <span>{w.label}</span>
                  </span>
                  <div className="text-[10px] font-normal text-gray-400 normal-case">
                    {w.from || '…'} → {w.to || '…'} · {fmtNum(w.row_count)} rows
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {METRICS.map((m) => {
              const baseVal = base?.metrics ? get(base.metrics, m.path) : null;
              return (
                <tr key={m.label} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-700">{m.label}</td>
                  {windows.map((w, i) => {
                    const v = w.metrics ? get(w.metrics, m.path) : null;
                    let delta = null;
                    if (i > 0 && !m.text && typeof v === 'number' && typeof baseVal === 'number' && baseVal !== 0) {
                      const pct = ((v - baseVal) / Math.abs(baseVal)) * 100;
                      const improved = m.lower ? pct < 0 : pct > 0;
                      delta = { pct: pct.toFixed(1), improved };
                    }
                    return (
                      <td key={i} className="px-4 py-2.5 text-right text-gray-800">
                        {w.metrics ? fmtCell(m, v) : <span className="text-amber-500 text-xs">no data</span>}
                        {delta && (
                          <span className={`ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${delta.improved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {delta.improved ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                            {delta.pct > 0 ? '+' : ''}{delta.pct}%
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {windows.length >= 2 && (
        <p className="text-[11px] text-gray-400 px-4 py-2 border-t bg-gray-50/60">
          % change is vs the first range ({windows[0].label}). Green = better (more calls / faster response).
        </p>
      )}
    </div>
  );
}

// ── main ────────────────────────────────────────────────────────────────────
export default function DateRangeCompare() {
  const [groups, setGroups] = useState(null);
  const [groupIdx, setGroupIdx] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState({}); // upload_id -> bool
  const [windows, setWindows] = useState([
    { key: 1, label: 'Range A', from: '', to: '' },
    { key: 2, label: 'Range B', from: '', to: '' },
  ]);
  const [nextKey, setNextKey] = useState(3);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    dateRange.groups()
      .then((d) => {
        const gs = d.groups || [];
        setGroups(gs);
        if (gs[0]) setSelectedFiles(Object.fromEntries(gs[0].files.map((f) => [f.upload_id, true])));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingGroups(false));
  }, []);

  const group = groups?.[groupIdx] || null;

  // When switching groups, default-select all files in that group.
  const chooseGroup = (idx) => {
    setGroupIdx(idx);
    const g = groups?.[idx];
    setSelectedFiles(g ? Object.fromEntries(g.files.map((f) => [f.upload_id, true])) : {});
    setResult(null);
  };

  const selectedIds = useMemo(
    () => (group?.files || []).filter((f) => selectedFiles[f.upload_id]).map((f) => f.upload_id),
    [group, selectedFiles],
  );

  // Available date bounds from the selected files.
  const bounds = useMemo(() => {
    const files = (group?.files || []).filter((f) => selectedFiles[f.upload_id]);
    const mins = files.map((f) => f.date_min).filter(Boolean);
    const maxs = files.map((f) => f.date_max).filter(Boolean);
    return {
      min: mins.length ? mins.reduce((a, b) => (a < b ? a : b)) : undefined,
      max: maxs.length ? maxs.reduce((a, b) => (a > b ? a : b)) : undefined,
    };
  }, [group, selectedFiles]);

  const setWindow = (key, next) => setWindows((ws) => ws.map((w) => (w.key === key ? next : w)));
  const addWindow = () => {
    setWindows((ws) => [...ws, { key: nextKey, label: `Range ${String.fromCharCode(65 + ws.length)}`, from: '', to: '' }]);
    setNextKey((k) => k + 1);
  };
  const removeWindow = (key) => setWindows((ws) => ws.filter((w) => w.key !== key));

  const canCompare = selectedIds.length > 0 && windows.some((w) => w.from || w.to);

  const runCompare = useCallback(async () => {
    setComparing(true); setError(''); setResult(null);
    try {
      const body = {
        upload_ids: selectedIds,
        windows: windows.map((w) => ({ label: w.label, from: w.from || null, to: w.to || null })),
      };
      const r = await dateRange.compare(body);
      if (r.error) setError(r.error);
      else setResult(r);
    } catch (e) {
      setError(e.message || 'Comparison failed');
    } finally {
      setComparing(false);
    }
  }, [selectedIds, windows]);

  if (loadingGroups) {
    return <div className="bg-white border rounded-xl p-8 text-center text-sm text-gray-400 animate-pulse">Loading your files…</div>;
  }

  if (!groups || groups.length === 0) {
    return (
      <div className="bg-white border rounded-xl p-10 text-center">
        <CalendarRange size={32} className="mx-auto text-gray-300 mb-3" />
        <p className="text-sm text-gray-500">No cleaned files yet. Upload and process a dataset to compare date ranges.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white border rounded-xl shadow-sm px-5 py-4">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <CalendarRange size={18} className="text-blue-600" /> Compare Date Ranges
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Pool your compatible files, then enter FROM/TO windows to compare the analytics within each period — even across different files.
        </p>
      </div>

      {/* Step 1 — files */}
      <div className="bg-white border rounded-xl shadow-sm p-5 space-y-3">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
          <Layers size={13} /> 1 · Files to pool
        </p>

        {groups.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {groups.map((g, i) => (
              <button key={i} onClick={() => chooseGroup(i)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${i === groupIdx ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                Set {i + 1}: {g.file_count} file{g.file_count > 1 ? 's' : ''} · {g.column_count} cols
              </button>
            ))}
          </div>
        )}
        {groups.length > 1 && (
          <p className="text-[11px] text-gray-400 flex items-start gap-1.5">
            <Info size={12} className="mt-0.5 flex-shrink-0" />
            Only files with the same column structure can be pooled. Each set above is one structure — pick the one holding your real data.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(group?.files || []).map((f) => (
            <label key={f.upload_id} className="flex items-center gap-2.5 border rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50">
              <input type="checkbox" checked={!!selectedFiles[f.upload_id]}
                onChange={(e) => setSelectedFiles((s) => ({ ...s, [f.upload_id]: e.target.checked }))}
                className="w-4 h-4 rounded accent-blue-600" />
              <div className="min-w-0">
                <p className="text-sm text-gray-800 truncate">{f.filename}</p>
                <p className="text-[11px] text-gray-400">{fmtNum(f.rows)} rows · {f.date_min || '?'} → {f.date_max || '?'}</p>
              </div>
            </label>
          ))}
        </div>
        {bounds.min && (
          <p className="text-[11px] text-gray-500">Data available in this pool: <strong>{bounds.min}</strong> → <strong>{bounds.max}</strong></p>
        )}
      </div>

      {/* Step 2 — windows */}
      <div className="bg-white border rounded-xl shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <CalendarRange size={13} /> 2 · Date ranges
          </p>
          {windows.length < 5 && (
            <button onClick={addWindow} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
              <Plus size={13} /> Add range
            </button>
          )}
        </div>
        <div className="space-y-2">
          {windows.map((w, i) => (
            <WindowRow key={w.key} win={w} index={i} bounds={bounds}
              onChange={(next) => setWindow(w.key, next)}
              onRemove={() => removeWindow(w.key)} canRemove={windows.length > 1} />
          ))}
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button onClick={runCompare} disabled={!canCompare || comparing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {comparing ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
            {comparing ? 'Comparing…' : 'Compare ranges'}
          </button>
          {!canCompare && <span className="text-xs text-gray-400">Pick at least one file and set a FROM or TO date.</span>}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-blue-700">
            <span className="font-semibold">Pooled {result.pool?.files} file{result.pool?.files > 1 ? 's' : ''}</span>
            <span>· {fmtNum(result.pool?.rows_used)} rows</span>
            {result.pool?.deduped > 0 && <span>· {fmtNum(result.pool.deduped)} exact-duplicate rows removed</span>}
            <span>· data {result.pool?.date_min} → {result.pool?.date_max}</span>
          </div>
          <ResultTable windows={result.windows} />
          <ResultCharts windows={result.windows} />
        </div>
      )}
    </div>
  );
}
