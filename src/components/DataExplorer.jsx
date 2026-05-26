'use client';

/**
 * DataExplorer — Professional EMS Analytics Workspace
 * Multi-panel layout: column sidebar · tabbed workspace · context panel
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { dataExplorer } from '@/lib/api';
import ColumnManager, { RoleBadge } from './ColumnManager';

// ─── Constants ─────────────────────────────────────────────────────────
const TYPE_COLORS = {
  number: 'bg-blue-100 text-blue-700',
  date: 'bg-purple-100 text-purple-700',
  boolean: 'bg-green-100 text-green-700',
  text: 'bg-gray-100 text-gray-600',
};
const CHART_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16'];
const OPERATORS = [
  { value: 'equals', label: 'equals' }, { value: 'not_equals', label: '≠' },
  { value: 'contains', label: 'contains' }, { value: 'starts_with', label: 'starts with' },
  { value: 'ends_with', label: 'ends with' },
  { value: 'gt', label: '>' }, { value: 'gte', label: '≥' },
  { value: 'lt', label: '<' }, { value: 'lte', label: '≤' },
  { value: 'between', label: 'between' }, { value: 'in', label: 'in list' },
  { value: 'is_null', label: 'is blank' }, { value: 'is_not_null', label: 'is not blank' },
];

const MAIN_TABS = [
  { id: 'overview',   label: 'Overview',   icon: '◈' },
  { id: 'data',       label: 'Data',       icon: '⊞' },
  { id: 'columns',    label: 'Columns',    icon: '≡' },
  { id: 'charts',     label: 'Charts',     icon: '▤' },
  { id: 'statistics', label: 'Statistics', icon: '∑' },
  { id: 'filters',    label: 'Filters',    icon: '⋟', badge: true },
];

const EMS_SEMANTIC_RULES = [
  { patterns: [/\bunit\b/i, /\btruck\b/i, /\bapparatus\b/i, /\bresource\b/i],                            label: 'EMS Unit',       color: 'bg-blue-100 text-blue-700' },
  { patterns: [/dispatch/i, /enroute/i, /arrival/i, /clear_time/i, /received/i, /\btime\b/i, /\bdate\b/i], label: 'Datetime',       color: 'bg-purple-100 text-purple-700' },
  { patterns: [/municipality/i, /\bmuni\b/i, /\bzone\b/i, /jurisdiction/i, /\bcity\b/i],                  label: 'Municipality',   color: 'bg-green-100 text-green-700' },
  { patterns: [/call_type/i, /\bnature\b/i, /service_type/i, /\btype\b/i, /problem/i],                    label: 'Call Type',      color: 'bg-orange-100 text-orange-700' },
  { patterns: [/incident/i, /call_no/i, /call_number/i],                                                    label: 'Incident ID',    color: 'bg-gray-100 text-gray-600' },
  { patterns: [/response_time/i, /chute/i, /turnout/i],                                                     label: 'Response Time',  color: 'bg-indigo-100 text-indigo-700' },
  { patterns: [/priority/i, /severity/i],                                                                    label: 'Priority',       color: 'bg-yellow-100 text-yellow-700' },
  { patterns: [/patient/i, /\bage\b/i, /\bsex\b/i, /gender/i],                                            label: 'Patient',        color: 'bg-red-100 text-red-700' },
];

function getEMSSemantic(colName) {
  return EMS_SEMANTIC_RULES.find(r => r.patterns.some(p => p.test(colName))) || null;
}

function computeHealthScore(profile) {
  let score = 100;
  const totalCells = (profile.row_count || 0) * (profile.column_count || 0);
  if (totalCells > 0) {
    const totalMissing = Object.values(profile.missing_values || {}).reduce((a, b) => a + b, 0);
    const pct = (totalMissing / totalCells) * 100;
    if      (pct > 50) score -= 40;
    else if (pct > 20) score -= 25;
    else if (pct > 5)  score -= 10;
    else if (pct > 0)  score -= 5;
  }
  return Math.max(0, score);
}

// ─────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────

function TypeBadge({ type }) {
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${TYPE_COLORS[type] || TYPE_COLORS.text}`}>{type}</span>;
}

function MissingBar({ pct }) {
  if (!pct) return null;
  const w = Math.min(pct, 100);
  const color = pct > 30 ? 'bg-red-400' : pct > 10 ? 'bg-yellow-400' : 'bg-orange-300';
  return (
    <div className="mt-1 h-1 w-full bg-gray-100 rounded overflow-hidden">
      <div className={`h-full ${color}`} style={{ width: `${w}%` }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Column Sidebar
// ─────────────────────────────────────────────────────────────

function ColumnSidebar({ columns, selectedCols, contextColumn, onToggle, onSelectColumn, onSelectAll, onClearAll, colSettings = {} }) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(
    () => columns.filter(c => c.name.toLowerCase().includes(search.toLowerCase())),
    [columns, search],
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Columns ({columns.length})</p>
        <input
          type="text" placeholder="Search columns…" value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <div className="flex gap-2 mt-2">
          <button onClick={onSelectAll} className="text-xs text-blue-600 hover:underline">All</button>
          <button onClick={onClearAll} className="text-xs text-gray-400 hover:underline">Clear</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto divide-y">
        {filtered.map(col => {
          const isCtx = contextColumn === col.name;
          return (
            <div key={col.name}
              className={`flex items-start gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer transition-colors ${
                isCtx ? 'bg-blue-50 border-l-2 border-blue-500' : ''
              }`}
              onClick={() => onSelectColumn(isCtx ? null : col.name)}
            >
              <input
                type="checkbox" className="mt-0.5 flex-shrink-0 cursor-pointer"
                checked={selectedCols.includes(col.name)}
                onChange={e => { e.stopPropagation(); onToggle(col.name); }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-xs font-medium truncate ${isCtx ? 'text-blue-700' : 'text-gray-800'}`}>{col.name}</span>
                  <TypeBadge type={col.type} />
                  <RoleBadge role={colSettings[col.name]?.role} />
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {col.unique_count} unique · {col.missing_pct}% missing
                </div>
                <MissingBar pct={col.missing_pct} />
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="px-3 py-6 text-xs text-gray-400 text-center">No columns match</p>}
      </div>
    </div>
  );
}

// ─── Overview Tab ───────────────────────────────────────────────────────
function OverviewTab({ profile, columns }) {
  const health = computeHealthScore(profile);
  const scoreColor = health >= 80 ? 'text-green-600' : health >= 60 ? 'text-yellow-600' : 'text-red-600';
  const scoreBg    = health >= 80 ? 'bg-green-50 border-green-200' : health >= 60 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';

  const totalMissing = Object.values(profile.missing_values || {}).reduce((a, b) => a + b, 0);
  const missingCols  = Object.values(profile.missing_values || {}).filter(v => v > 0).length;
  const numericCount = Object.keys(profile.numeric_summary || {}).length;

  const cardColors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800', gray: 'bg-gray-50 border-gray-200 text-gray-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-800', yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    purple: 'bg-purple-50 border-purple-200 text-purple-800', green: 'bg-green-50 border-green-200 text-green-800',
    teal: 'bg-teal-50 border-teal-200 text-teal-800',
  };
  const cards = [
    { label: 'Total Rows',    value: profile.row_count?.toLocaleString() ?? '—',  color: 'blue' },
    { label: 'Columns',       value: profile.column_count ?? '—',                  color: 'gray' },
    { label: 'Missing Values',value: totalMissing.toLocaleString(),                 color: totalMissing > 0 ? 'orange' : 'green' },
    { label: 'Cols w/ Gaps',  value: missingCols,                                   color: missingCols > 0 ? 'yellow' : 'green' },
    { label: 'Datetime Cols', value: profile.date_columns_detected?.length ?? 0,    color: 'purple' },
    { label: 'Numeric Cols',  value: numericCount,                                   color: 'teal' },
    { label: 'Categorical',   value: profile.categorical_columns_detected?.length ?? 0, color: 'green' },
    { label: 'Text Cols',     value: columns.filter(c => c.type === 'text').length, color: 'gray' },
  ];

  const warnings = [];
  if (totalMissing > 0) warnings.push(`${totalMissing.toLocaleString()} missing values across ${missingCols} column(s)`);
  if (!profile.date_columns_detected?.length) warnings.push('No date columns detected — set Analytics Fields for time-based analysis');
  const highMissing = Object.entries(profile.missing_percent || {}).filter(([, p]) => p > 50);
  if (highMissing.length) warnings.push(`${highMissing.length} column(s) >50% missing: ${highMissing.slice(0, 3).map(([c]) => c).join(', ')}`);

  const typeGroups = [
    { label: 'Numeric',   cols: Object.keys(profile.numeric_summary || {}),           color: '#3b82f6' },
    { label: 'Datetime',  cols: profile.date_columns_detected || [],                   color: '#8b5cf6' },
    { label: 'Categorical', cols: profile.categorical_columns_detected || [],          color: '#10b981' },
    { label: 'Text/Other', cols: columns.filter(c =>
        !Object.keys(profile.numeric_summary || {}).includes(c.name) &&
        !profile.date_columns_detected?.includes(c.name) &&
        !profile.categorical_columns_detected?.includes(c.name)
      ).map(c => c.name), color: '#6b7280' },
  ].filter(g => g.cols.length > 0);

  return (
    <div className="space-y-6">
      {/* Health score + stat cards */}
      <div className="flex gap-4 items-start flex-wrap">
        <div className={`flex-shrink-0 rounded-xl border p-5 text-center w-28 ${scoreBg}`}>
          <div className={`text-4xl font-bold ${scoreColor}`}>{health}</div>
          <div className={`text-xs font-semibold mt-1 ${scoreColor}`}>Health Score</div>
          <div className="text-[10px] text-gray-400 mt-0.5">/100</div>
        </div>
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 min-w-0">
          {cards.map(c => (
            <div key={c.label} className={`rounded-lg border px-3 py-2.5 ${cardColors[c.color]}`}>
              <div className="text-lg font-bold">{c.value}</div>
              <div className="text-[11px] font-medium mt-0.5">{c.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Date range */}
      {profile.date_range && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 flex flex-wrap items-center gap-4 text-sm">
          <span className="text-purple-400">📅</span>
          <span className="font-semibold text-purple-800">Date Range</span>
          <span className="text-purple-600 text-xs">({profile.date_range.column})</span>
          <span className="font-mono text-purple-700">
            {profile.date_range.min?.slice(0, 10)} → {profile.date_range.max?.slice(0, 10)}
          </span>
        </div>
      )}

      {/* Quality notices */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700">⚠ Quality Notices</h3>
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <span className="flex-shrink-0">⚠</span><span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Column type breakdown */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Column Type Breakdown</h3>
        <div className="space-y-2">
          {typeGroups.map(g => (
            <div key={g.label} className="flex items-center gap-3">
              <span className="text-xs text-gray-600 w-20 flex-shrink-0">{g.label}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${(g.cols.length / (profile.column_count || 1)) * 100}%`, backgroundColor: g.color }} />
              </div>
              <span className="text-xs text-gray-500 w-8 text-right">{g.cols.length}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Missing values per column */}
      {Object.values(profile.missing_values || {}).some(v => v > 0) && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Missing Values by Column</h3>
          <div className="max-h-52 overflow-y-auto space-y-1.5">
            {Object.entries(profile.missing_percent || {})
              .filter(([, p]) => p > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([col, pct]) => (
                <div key={col} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gray-700 w-44 flex-shrink-0 truncate">{col}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className={`h-full rounded-full ${pct > 30 ? 'bg-red-400' : pct > 10 ? 'bg-yellow-400' : 'bg-orange-300'}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                  <span className={`text-xs font-medium w-10 text-right ${pct > 30 ? 'text-red-600' : pct > 10 ? 'text-yellow-600' : 'text-orange-500'}`}>
                    {pct.toFixed(1)}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Data Preview Table
// ─────────────────────────────────────────────────────────────

function DataPreviewTable({ uploadId, selectedCols, activeFilters }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [tableSearch, setTableSearch] = useState('');
  const PAGE_SIZE = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const body = {
        filters: activeFilters,
        selected_columns: selectedCols,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        sort_by: sortCol,
        sort_dir: sortDir,
      };
      const res = await dataExplorer.query(uploadId, body);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [uploadId, selectedCols, activeFilters, page, sortCol, sortDir]);

  useEffect(() => { setPage(0); }, [selectedCols, activeFilters, sortCol, sortDir]);
  useEffect(() => { load(); }, [load]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const exportCSV = () => {
    if (!data?.rows?.length) return;
    const cols = data.columns || [];
    const header = cols.join(',');
    const rows = data.rows.map(r =>
      cols.map(c => { const v = r[c]; if (v == null) return ''; const s = String(v); return s.includes(',') ? `"${s}"` : s; }).join(',')
    );
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'data_export.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !data) return <div className="py-8 text-center text-sm text-gray-400">Loading table…</div>;
  if (!data) return null;

  const cols = data.columns || [];
  const rows = tableSearch
    ? data.rows.filter(r => Object.values(r).some(v => String(v ?? '').toLowerCase().includes(tableSearch.toLowerCase())))
    : data.rows;

  const totalPages = Math.ceil(data.total / PAGE_SIZE);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text" placeholder="Search visible rows…" value={tableSearch}
          onChange={e => setTableSearch(e.target.value)}
          className="border rounded px-3 py-1.5 text-xs w-56 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <span className="text-xs text-gray-400">{data.total.toLocaleString()} total rows</span>
        {loading && <span className="text-xs text-blue-500">Updating…</span>}
        <button onClick={exportCSV} className="ml-auto text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded border border-gray-200">
          ↓ Export CSV
        </button>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[520px]">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-2 py-2 text-left font-medium text-gray-400 border-b w-10">#</th>
                {cols.map(col => (
                  <th key={col} onClick={() => handleSort(col)}
                    className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap cursor-pointer hover:bg-gray-100 select-none border-b">
                    {col}{sortCol === col ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0
                ? <tr><td colSpan={cols.length + 1} className="px-3 py-6 text-center text-gray-400">No rows match</td></tr>
                : rows.map((row, i) => {
                  const hasNull = Object.values(row).some(v => v == null || v === '');
                  return (
                    <tr key={i} className={`hover:bg-blue-50 transition-colors ${hasNull ? 'bg-amber-50/40' : ''}`}>
                      <td className="px-2 py-1.5 text-gray-300 text-right">{page * PAGE_SIZE + i + 1}</td>
                      {cols.map(col => {
                        const isNull = row[col] == null || row[col] === '';
                        return (
                          <td key={col} className={`px-3 py-1.5 whitespace-nowrap max-w-[200px] truncate ${isNull ? 'text-gray-300 italic' : 'text-gray-700'}`}>
                            {isNull ? 'null' : String(row[col])}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
          className="text-xs px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50">← Prev</button>
        <span className="text-xs text-gray-500">Page {page + 1} of {Math.max(1, totalPages)}</span>
        <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
          className="text-xs px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50">Next →</button>
        <span className="text-xs text-gray-400 ml-2">
          Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data.total)} of {data.total.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Filter Builder
// ─────────────────────────────────────────────────────────────

function FilterBuilder({ columns, filters, onChange }) {
  const addFilter = () => onChange([...filters, { column: columns[0]?.name || '', operator: 'equals', value: '' }]);
  const removeFilter = (i) => onChange(filters.filter((_, idx) => idx !== i));
  const updateFilter = (i, patch) => onChange(filters.map((f, idx) => idx === i ? { ...f, ...patch } : f));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-semibold text-gray-700">Active Filters</span>
        <button onClick={addFilter}
          className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
          + Add Filter
        </button>
        {filters.length > 0 && (
          <button onClick={() => onChange([])} className="text-xs text-red-400 hover:text-red-600 ml-auto">
            Clear all
          </button>
        )}
      </div>

      {filters.length === 0 && (
        <p className="text-xs text-gray-400 italic">No filters applied — showing all rows.</p>
      )}

      {filters.map((f, i) => {
        const noValue = f.operator === 'is_null' || f.operator === 'is_not_null';
        const isBetween = f.operator === 'between';
        const isList = f.operator === 'in';
        return (
          <div key={i} className="flex items-center flex-wrap gap-2 bg-gray-50 border rounded px-3 py-2">
            <select value={f.column} onChange={e => updateFilter(i, { column: e.target.value })}
              className="border rounded px-2 py-1 text-xs max-w-[180px]">
              {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
            <select value={f.operator} onChange={e => updateFilter(i, { operator: e.target.value, value: '' })}
              className="border rounded px-2 py-1 text-xs">
              {OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {!noValue && !isBetween && !isList && (
              <input type="text" value={f.value || ''} placeholder="value…"
                onChange={e => updateFilter(i, { value: e.target.value })}
                className="border rounded px-2 py-1 text-xs w-32" />
            )}
            {isBetween && (
              <>
                <input type="text" placeholder="from" value={Array.isArray(f.value) ? f.value[0] : ''}
                  onChange={e => updateFilter(i, { value: [e.target.value, Array.isArray(f.value) ? f.value[1] : ''] })}
                  className="border rounded px-2 py-1 text-xs w-24" />
                <span className="text-xs text-gray-400">–</span>
                <input type="text" placeholder="to" value={Array.isArray(f.value) ? f.value[1] : ''}
                  onChange={e => updateFilter(i, { value: [Array.isArray(f.value) ? f.value[0] : '', e.target.value] })}
                  className="border rounded px-2 py-1 text-xs w-24" />
              </>
            )}
            {isList && (
              <input type="text" placeholder="val1, val2, …" value={Array.isArray(f.value) ? f.value.join(', ') : ''}
                onChange={e => updateFilter(i, { value: e.target.value.split(',').map(v => v.trim()) })}
                className="border rounded px-2 py-1 text-xs w-48" />
            )}
            <button onClick={() => removeFilter(i)} className="text-gray-300 hover:text-red-500 text-base leading-none ml-auto">×</button>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Chart Builder
// ─────────────────────────────────────────────────────────────

function ChartBuilder({ uploadId, columns, activeFilters }) {
  const [xCol, setXCol] = useState('');
  const [yCol, setYCol] = useState('');
  const [agg, setAgg] = useState('count');
  const [chartType, setChartType] = useState('bar');
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const numCols = columns.filter(c => c.type === 'number');

  const generate = async () => {
    if (!xCol) return;
    setLoading(true); setError('');
    try {
      const res = await dataExplorer.getChartData(uploadId, {
        x_col: xCol, y_col: yCol || undefined,
        aggregation: agg, chart_type: chartType,
        filters: activeFilters, limit: 40,
      });
      if (res.error) throw new Error(res.error);
      setChartData(res);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const renderChart = () => {
    if (!chartData?.data?.length) return <p className="text-xs text-gray-400 italic">No data to display.</p>;
    const d = chartData.data;
    const common = { data: d, margin: { top: 5, right: 20, left: 0, bottom: 60 } };

    if (chartType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie data={d} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
              {d.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => v?.toLocaleString()} />
          </PieChart>
        </ResponsiveContainer>
      );
    }
    if (chartType === 'scatter') {
      return (
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart {...{ margin: common.margin }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Scatter data={d} fill="#3b82f6" />
          </ScatterChart>
        </ResponsiveContainer>
      );
    }
    const ChartComp = chartType === 'line' ? LineChart : BarChart;
    const DataComp = chartType === 'line' ? Line : Bar;
    return (
      <ResponsiveContainer width="100%" height={320}>
        <ChartComp {...common}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v?.toLocaleString()} />
          <Tooltip formatter={(v) => v?.toLocaleString()} />
          <Legend />
          {chartType === 'line'
            ? <Line type="monotone" dataKey="value" stroke="#3b82f6" dot={false} strokeWidth={2} name={agg} />
            : <Bar dataKey="value" name={agg} fill="#3b82f6">
                {d.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
              </Bar>
          }
        </ChartComp>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">X-Axis (group by)</label>
          <select value={xCol} onChange={e => setXCol(e.target.value)} className="w-full border rounded px-2 py-1.5 text-xs">
            <option value="">— select —</option>
            {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Y-Axis (value)</label>
          <select value={yCol} onChange={e => setYCol(e.target.value)} className="w-full border rounded px-2 py-1.5 text-xs">
            <option value="">count rows</option>
            {numCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Aggregation</label>
          <select value={agg} onChange={e => setAgg(e.target.value)} className="w-full border rounded px-2 py-1.5 text-xs">
            {['count','sum','average','median','min','max'].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Chart Type</label>
          <select value={chartType} onChange={e => setChartType(e.target.value)} className="w-full border rounded px-2 py-1.5 text-xs">
            {['bar','line','pie','scatter'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button onClick={generate} disabled={!xCol || loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded text-xs font-medium">
            {loading ? 'Building…' : 'Generate'}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}

      {chartData && (
        <div className="border rounded-lg p-4 bg-white">
          <p className="text-xs text-gray-500 mb-3">
            <span className="font-medium">{chartData.x_col}</span>
            {chartData.y_col ? ` × ${chartData.y_col}` : ''} · {agg}
            {' '}· {chartData.data?.length} groups
            {activeFilters.length > 0 && <span className="text-blue-600"> (filtered)</span>}
          </p>
          {renderChart()}
        </div>
      )}
    </div>
  );
}

// ─── Column Explorer Tab ──────────────────────────────────────────────
function ColumnExplorerTab({ columns, profile, onSelectColumn }) {
  const [colSearch, setColSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = useMemo(() => columns.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(colSearch.toLowerCase());
    const matchType   = typeFilter === 'all' || c.type === typeFilter;
    return matchSearch && matchType;
  }), [columns, colSearch, typeFilter]);

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center flex-wrap">
        <input type="text" placeholder="Search columns…" value={colSearch}
          onChange={e => setColSearch(e.target.value)}
          className="border rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 w-52" />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="border rounded px-2 py-1.5 text-xs">
          <option value="all">All types</option>
          <option value="number">Numeric</option>
          <option value="date">Date</option>
          <option value="text">Text</option>
          <option value="boolean">Boolean</option>
        </select>
        <span className="text-xs text-gray-400">{filtered.length} column{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(col => {
          const semantic   = getEMSSemantic(col.name);
          const numStats   = profile.numeric_summary?.[col.name];
          const missingPct = profile.missing_percent?.[col.name] || 0;
          const samples    = profile.sample_values?.[col.name] || [];
          const unique     = profile.unique_counts?.[col.name] ?? col.unique_count;
          const fmtN = (v) => v != null ? Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 }) : '—';
          return (
            <div key={col.name}
              className="bg-white border rounded-lg p-3 hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all group"
              onClick={() => onSelectColumn(col.name)}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-800 truncate group-hover:text-blue-700 transition-colors">{col.name}</div>
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    <TypeBadge type={col.type} />
                    {semantic && <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${semantic.color}`}>{semantic.label}</span>}
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 ml-2 flex-shrink-0">{unique?.toLocaleString()} uniq</span>
              </div>

              <div className="mb-2">
                <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                  <span>Missing</span>
                  <span className={missingPct > 10 ? 'text-orange-500 font-medium' : ''}>{missingPct.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${
                    missingPct > 30 ? 'bg-red-400' : missingPct > 10 ? 'bg-yellow-400' : missingPct > 0 ? 'bg-orange-300' : 'bg-green-300'
                  }`} style={{ width: `${missingPct > 0 ? Math.max(4, missingPct) : 0}%` }} />
                </div>
              </div>

              {numStats && (
                <div className="grid grid-cols-3 gap-1">
                  {[['min', numStats.min], ['mean', numStats.mean], ['max', numStats.max]].map(([k, v]) => (
                    <div key={k} className="bg-gray-50 rounded px-1.5 py-1 text-center">
                      <div className="text-[9px] text-gray-400 uppercase">{k}</div>
                      <div className="text-[10px] text-gray-700 font-medium">{fmtN(v)}</div>
                    </div>
                  ))}
                </div>
              )}

              {!numStats && samples.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {samples.slice(0, 3).map((v, i) => (
                    <span key={i} className="text-[10px] bg-gray-50 border rounded px-1.5 py-0.5 text-gray-600 truncate max-w-[80px]">{String(v)}</span>
                  ))}
                  {samples.length > 3 && <span className="text-[10px] text-gray-400">+{samples.length - 3}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Statistics Tab ─────────────────────────────────────────────────────
function StatisticsTab({ profile }) {
  const numericCols = Object.keys(profile.numeric_summary || {});
  if (!numericCols.length) return <p className="text-sm text-gray-400 italic">No numeric columns detected.</p>;

  const fmtN = (v, d = 2) => v != null ? Number(v).toLocaleString(undefined, { maximumFractionDigits: d }) : '—';

  const stats = numericCols.map(col => ({
    col,
    ...profile.numeric_summary[col],
    missingPct: profile.missing_percent?.[col] || 0,
    unique: profile.unique_counts?.[col],
  }));

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">{numericCols.length} numeric columns</p>
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {['Column', 'Missing %', 'Unique', 'Min', 'Mean', 'Median', 'Max', 'Std Dev'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-600 border-b whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats.map(s => (
                <tr key={s.col} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-gray-800 font-medium whitespace-nowrap">{s.col}</td>
                  <td className={`px-3 py-2 ${s.missingPct > 10 ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>{s.missingPct.toFixed(1)}%</td>
                  <td className="px-3 py-2 text-gray-500">{s.unique?.toLocaleString() ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-600 font-mono">{fmtN(s.min, 3)}</td>
                  <td className="px-3 py-2 font-mono font-semibold text-blue-700">{fmtN(s.mean, 3)}</td>
                  <td className="px-3 py-2 text-gray-600 font-mono">{fmtN(s.median, 3)}</td>
                  <td className="px-3 py-2 text-gray-600 font-mono">{fmtN(s.max, 3)}</td>
                  <td className="px-3 py-2 text-gray-400 font-mono">{fmtN(s.std, 3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Context Panel (right sidebar) ──────────────────────────────────────
function ContextPanel({ colName, columns, profile, onAddFilter, onClose }) {
  if (!colName) return null;
  const col = columns.find(c => c.name === colName);
  if (!col) return null;

  const semantic    = getEMSSemantic(colName);
  const numStats    = profile.numeric_summary?.[colName];
  const missingPct  = profile.missing_percent?.[colName] || 0;
  const missingCnt  = profile.missing_values?.[colName] || 0;
  const unique      = profile.unique_counts?.[colName] ?? col.unique_count;
  const samples     = profile.sample_values?.[colName] || [];
  const fmtN = (v, d = 3) => v != null ? Number(v).toLocaleString(undefined, { maximumFractionDigits: d }) : '—';

  return (
    <div className="w-64 flex-shrink-0 bg-white border-l flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 flex-shrink-0">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Column</div>
          <div className="text-sm font-bold text-gray-900 truncate max-w-[170px] mt-0.5">{colName}</div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-2 flex-shrink-0">×</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Type + semantic */}
        <div className="flex flex-wrap gap-1.5">
          <TypeBadge type={col.type} />
          {semantic && <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${semantic.color}`}>{semantic.label}</span>}
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Unique',    value: unique?.toLocaleString() },
            { label: 'Missing',   value: missingCnt?.toLocaleString() },
            { label: 'Missing %', value: `${missingPct.toFixed(1)}%` },
            { label: 'Total',     value: profile.row_count?.toLocaleString() },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-lg px-3 py-2">
              <div className="text-[9px] text-gray-400 uppercase tracking-wide">{s.label}</div>
              <div className="text-sm font-semibold text-gray-700 mt-0.5">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Completeness bar */}
        <div>
          <div className="flex justify-between text-[10px] text-gray-400 mb-1">
            <span>Completeness</span><span>{(100 - missingPct).toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-400 rounded-full" style={{ width: `${100 - missingPct}%` }} />
          </div>
        </div>

        {/* Numeric stats */}
        {numStats && (
          <div>
            <div className="text-xs font-semibold text-gray-600 mb-2">Distribution</div>
            <div className="space-y-1.5">
              {[
                ['Min',     numStats.min],
                ['Mean',    numStats.mean],
                ['Median',  numStats.median],
                ['Max',     numStats.max],
                ['Std Dev', numStats.std],
              ].map(([lbl, v]) => (
                <div key={lbl} className="flex justify-between text-xs">
                  <span className="text-gray-500">{lbl}</span>
                  <span className="font-mono font-medium text-gray-800">{fmtN(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sample values */}
        {samples.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-gray-600 mb-2">Sample Values</div>
            <div className="flex flex-wrap gap-1">
              {samples.slice(0, 10).map((v, i) => (
                <span key={i} className="text-[10px] bg-gray-50 border rounded px-2 py-0.5 text-gray-600 font-mono max-w-[140px] truncate">{String(v ?? 'null')}</span>
              ))}
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-2">Quick Actions</div>
          <button onClick={() => onAddFilter(colName)}
            className="w-full text-left text-xs px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-100 transition-colors">
            + Add filter on this column
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Section wrapper (collapsible)
// ─────────────────────────────────────────────────────────────

function Section({ title, children, defaultOpen = true, badge }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-xl overflow-hidden bg-white">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100 text-left">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">{title}</span>
          {badge != null && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{badge}</span>}
        </div>
        <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="p-5">{children}</div>}
    </div>
  );
}

// ─── Main DataExplorer Component ────────────────────────────────────────────

export default function DataExplorer({ uploadId, uploadName, isAdmin = false }) {
  const [profile, setProfile]           = useState(null);
  const [columns, setColumns]           = useState([]);
  const [selectedCols, setSelectedCols] = useState([]);
  const [filters, setFilters]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [refreshing, setRefreshing]     = useState(false);
  const [sidebarTab, setSidebarTab]     = useState('columns');
  const [colSettings, setColSettings]   = useState({});
  const [mainTab, setMainTab]           = useState('overview');
  const [contextColumn, setContextColumn] = useState(null);

  const loadProfile = useCallback(async (refresh = false) => {
    setError('');
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const [profileRes, colsRes] = await Promise.all([
        dataExplorer.getProfile(uploadId, refresh),
        dataExplorer.getColumns(uploadId),
      ]);
      setProfile(profileRes.profile);
      setColumns(colsRes);
      setSelectedCols(colsRes.map(c => c.name));
    } catch (e) {
      setError(e.message || 'Failed to load profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [uploadId]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const toggleCol = (name) =>
    setSelectedCols(prev => prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]);

  const ignoredColNames = useMemo(
    () => new Set(Object.keys(colSettings).filter(k => colSettings[k]?.is_ignored)),
    [colSettings],
  );
  const activeColumns = useMemo(
    () => columns.filter(c => !ignoredColNames.has(c.name)),
    [columns, ignoredColNames],
  );
  const activeFilters = useMemo(() =>
    filters.filter(f => {
      if (f.operator === 'is_null' || f.operator === 'is_not_null') return true;
      if (f.operator === 'between') return Array.isArray(f.value) && f.value[0] && f.value[1];
      if (f.operator === 'in') return Array.isArray(f.value) && f.value.length > 0;
      return f.value !== '' && f.value != null;
    }), [filters]);

  const handleAddFilterFromContext = (colName) => {
    setFilters(f => [...f, { column: colName, operator: 'equals', value: '' }]);
    setMainTab('filters');
    setContextColumn(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm text-gray-500">Profiling dataset…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
      <p className="font-medium mb-1">Failed to load profile</p>
      <p className="text-xs">{error}</p>
      <button onClick={() => loadProfile()} className="mt-3 text-xs text-red-600 underline">Retry</button>
    </div>
  );

  if (!profile) return null;

  return (
    <div className="flex h-full overflow-hidden bg-gray-50">

      {/* ── Left Sidebar ─────────────────────────────────────────────── */}
      <div className="w-52 flex-shrink-0 border-r bg-white h-full overflow-hidden flex flex-col">
        <div className="flex border-b flex-shrink-0">
          {[['columns', 'Columns'], ['manage', 'Manage']].map(([tab, label]) => (
            <button key={tab} onClick={() => setSidebarTab(tab)}
              className={`flex-1 text-xs py-2.5 font-medium transition-colors ${
                sidebarTab === tab
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                  : 'text-gray-400 hover:text-gray-600'
              }`}>
              {label}
              {tab === 'manage' && ignoredColNames.size > 0 && (
                <span className="ml-1 text-[9px] bg-orange-500 text-white rounded-full px-1">{ignoredColNames.size}</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-hidden">
          {sidebarTab === 'columns'
            ? <ColumnSidebar
                columns={activeColumns}
                selectedCols={selectedCols}
                contextColumn={contextColumn}
                onToggle={toggleCol}
                onSelectColumn={setContextColumn}
                onSelectAll={() => setSelectedCols(activeColumns.map(c => c.name))}
                onClearAll={() => setSelectedCols([])}
                colSettings={colSettings}
              />
            : <ColumnManager
                uploadId={uploadId}
                allColumns={columns.map(c => c.name)}
                onSettingsChange={setColSettings}
              />
          }
        </div>
      </div>

      {/* ── Center: Header + Tabs + Content ──────────────────────────── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">

        {/* Top header bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b bg-white flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-gray-900 leading-tight">Analytics Workspace</h1>
              {uploadName && <p className="text-[11px] text-gray-500 truncate max-w-xs">{uploadName}</p>}
            </div>
            <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex-shrink-0">
              {profile.row_count?.toLocaleString()} × {profile.column_count}
            </span>
            {activeFilters.length > 0 && (
              <span className="text-[11px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex-shrink-0">
                {activeFilters.length} filter{activeFilters.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button onClick={() => loadProfile(true)} disabled={refreshing}
            className="text-xs text-blue-600 hover:underline disabled:opacity-50 flex-shrink-0">
            {refreshing ? 'Refreshing…' : '⟳ Refresh'}
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b bg-white flex-shrink-0 overflow-x-auto">
          {MAIN_TABS.map(tab => (
            <button key={tab.id} onClick={() => setMainTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                mainTab === tab.id
                  ? 'text-blue-600 border-blue-600 bg-blue-50/60'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
              }`}>
              <span className="text-base leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge && activeFilters.length > 0 && (
                <span className="bg-blue-600 text-white text-[9px] rounded-full px-1.5 leading-5">{activeFilters.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content area */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-5 pb-16 max-w-5xl">
            {mainTab === 'overview' && (
              <OverviewTab profile={profile} columns={activeColumns} />
            )}
            {mainTab === 'data' && (
              <DataPreviewTable
                uploadId={uploadId}
                selectedCols={selectedCols}
                activeFilters={activeFilters}
              />
            )}
            {mainTab === 'columns' && (
              <ColumnExplorerTab
                columns={activeColumns}
                profile={profile}
                onSelectColumn={(name) => { setContextColumn(name); setSidebarTab('columns'); }}
              />
            )}
            {mainTab === 'charts' && (
              <ChartBuilder
                uploadId={uploadId}
                columns={activeColumns}
                activeFilters={activeFilters}
              />
            )}
            {mainTab === 'statistics' && (
              <StatisticsTab profile={profile} />
            )}
            {mainTab === 'filters' && (
              <div className="space-y-4">
                <FilterBuilder columns={activeColumns} filters={filters} onChange={setFilters} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Right Context Panel ───────────────────────────────────────── */}
      {contextColumn && (
        <ContextPanel
          colName={contextColumn}
          columns={columns}
          profile={profile}
          onAddFilter={handleAddFilterFromContext}
          onClose={() => setContextColumn(null)}
        />
      )}
    </div>
  );
}
