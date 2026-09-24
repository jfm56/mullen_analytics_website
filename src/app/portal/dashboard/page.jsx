'use client';
import { useState, useEffect, useCallback } from 'react';
import { dataUploads, dashboardFilter } from '@/lib/api';
import EMSDashboard from '@/components/EMSDashboard';
import AiInsights from '@/components/AiInsights';
import PredictiveAnalytics from '@/components/PredictiveAnalytics';
import TurnoverRisk from '@/components/TurnoverRisk';
import WeatherTrafficForecast from '@/components/WeatherTrafficForecast';
import IftOutlook from '@/components/IftOutlook';
import PageTabs from '@/components/ui/PageTabs';
import GeographicHeatMap from '@/components/GeographicHeatMap';
import StagingRecommender from '@/components/StagingRecommender';
import EmergencyTransportOutlook from '@/components/EmergencyTransportOutlook';
import MvaHotspots from '@/components/MvaHotspots';
import DateRangeCompare from '@/components/DateRangeCompare';
import ErrorAlert from '@/components/ui/ErrorAlert';
import { SkeletonCard } from '@/components/ui/LoadingSkeleton';
import Link from 'next/link';
import { BarChart2, X, Plus, SlidersHorizontal, RefreshCw, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Search, LayoutDashboard, CalendarClock, MapPin, CalendarRange } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend
} from 'recharts';
import CHART from '@/lib/chartTheme';

const SLOT_COLORS = CHART.series;

async function apiFetch(path, opts) {
  const res = await fetch(`/api/proxy${path}`, { credentials: 'include', ...opts });
  if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.detail||`HTTP ${res.status}`); }
  return res.json();
}

function uploadLabel(u) {
  const year = u.reporting_year ? u.reporting_year : new Date(u.created_at).getFullYear();
  return u.reporting_year ? `${year}` : `${u.original_filename.replace(/\.csv$/i,'')} (${year})`;
}

function getNestedVal(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? null : o[k]), obj);
}

function fmtVal(v, format) {
  if (v == null) return '—';
  if (format === 'minutes') {
    const mins = Math.floor(v);
    const secs = Math.round((v - mins) * 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  }
  if (format === 'pct') return `${Number(v).toFixed(1)}%`;
  return Number(v).toLocaleString();
}

function pctVsFirst(base, val) {
  if (base == null || val == null || base === 0) return null;
  return ((val - base) / base * 100).toFixed(1);
}

const COMPARE_METRICS = [
  { label: 'Total Calls',            path: 'call_volume.total_calls',                    lower: false },
  { label: 'Avg Calls / Day',        path: 'call_volume.avg_calls_per_day',              lower: false },
  { label: 'Avg Response Time',      path: 'response_times.mean_minutes',                lower: true,  format: 'minutes' },
  { label: 'Median Response Time',   path: 'response_times.median_minutes',              lower: true,  format: 'minutes' },
  { label: 'P90 Response Time',      path: 'response_times.p90_minutes',                 lower: true,  format: 'minutes' },
  { label: 'Dispatch → Enroute',     path: 'response_times.dispatch_to_enroute_median',  lower: true,  format: 'minutes' },
  { label: 'Enroute → On Scene',     path: 'response_times.enroute_to_arrival_median',   lower: true,  format: 'minutes' },
  { label: 'Received → Dispatch',    path: 'response_times.received_to_dispatch_median', lower: true,  format: 'minutes' },
];

const EMPTY_FILTERS = { units: [], municipalities: [], call_types: [], exclude_interfacility: false, emergency_only: false, date_range: null };

function CheckboxGroup({ label, options, selected, onChange }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
  const toggle = v => onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
  const allSelected = options.length > 0 && options.every(o => selected.includes(o));

  return (
    <div className="border rounded-lg overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100">
        <span>{label} {selected.length > 0 && <span className="ml-1 bg-blue-600 text-white rounded-full px-1.5">{selected.length}</span>}</span>
        {open ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
      </button>
      {open && (
        <div className="p-2 space-y-1.5">
          <div className="relative">
            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
              className="w-full pl-6 pr-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"/>
          </div>
          <div className="max-h-36 overflow-y-auto space-y-0.5">
            <label className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-gray-50 cursor-pointer text-xs text-gray-500 italic">
              <input type="checkbox" checked={allSelected}
                onChange={()=>onChange(allSelected ? [] : [...options])} className="rounded"/>
              Select all
            </label>
            {filtered.map(opt => (
              <label key={opt} className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-gray-50 cursor-pointer text-xs text-gray-700">
                <input type="checkbox" checked={selected.includes(opt)} onChange={()=>toggle(opt)} className="rounded"/>
                <span className="truncate">{opt}</span>
              </label>
            ))}
          </div>
          {selected.length > 0 && (
            <button onClick={()=>onChange([])} className="text-[10px] text-red-500 hover:underline w-full text-left px-1">Clear all</button>
          )}
        </div>
      )}
    </div>
  );
}

function FilterPanel({ uploadId, filters, onChange, onApply, loading }) {
  const [opts, setOpts] = useState(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!uploadId) return;
    dashboardFilter.getFilterOptions(uploadId).then(setOpts).catch(() => {});
  }, [uploadId]);

  const set = (k, v) => onChange({ ...filters, [k]: v });
  const hasActive = filters.units?.length || filters.municipalities?.length ||
    filters.call_types?.length || filters.exclude_interfacility || filters.emergency_only || filters.date_range;

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50">
        <span className="flex items-center gap-2">
          <SlidersHorizontal size={15} />
          Filters
          {hasActive && <span className="bg-blue-600 text-white text-[10px] rounded-full px-1.5 py-0.5">Active</span>}
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-4 border-t pt-3">
          {/* Quick presets */}
          <div className="flex flex-wrap gap-2">
            {[{label:'All Calls',f:{}},{label:'Emergency Only',f:{emergency_only:true}},{label:'Excl. IFT',f:{exclude_interfacility:true}},{label:'IFT Only',f:{ift_only:true}}].map(p=>(
              <button key={p.label} onClick={()=>{onChange({...EMPTY_FILTERS,...p.f}); onApply({...EMPTY_FILTERS,...p.f});}}
                className="px-3 py-1 rounded-full border text-xs border-gray-200 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 text-gray-600 transition-colors">
                {p.label}
              </button>
            ))}
          </div>

          {/* Toggle checkboxes */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
              <input type="checkbox" checked={filters.exclude_interfacility} onChange={e=>set('exclude_interfacility',e.target.checked)} className="w-4 h-4 rounded accent-blue-600"/>
              Exclude IFT transfers
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
              <input type="checkbox" checked={filters.emergency_only} onChange={e=>set('emergency_only',e.target.checked)} className="w-4 h-4 rounded accent-blue-600"/>
              Emergency calls only
            </label>
          </div>

          {/* Date range */}
          {opts?.date_range && (
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1">Date Range</p>
              <div className="flex items-center gap-2">
                <input type="date" value={filters.date_range?.[0]||''} min={opts.date_range.min} max={opts.date_range.max}
                  onChange={e=>set('date_range',[e.target.value,filters.date_range?.[1]||opts.date_range.max])}
                  className="border rounded px-2 py-1.5 text-sm flex-1 focus:outline-none focus:ring-1 focus:ring-blue-500"/>
                <span className="text-gray-400 text-xs">to</span>
                <input type="date" value={filters.date_range?.[1]||''} min={opts.date_range.min} max={opts.date_range.max}
                  onChange={e=>set('date_range',[filters.date_range?.[0]||opts.date_range.min,e.target.value])}
                  className="border rounded px-2 py-1.5 text-sm flex-1 focus:outline-none focus:ring-1 focus:ring-blue-500"/>
                {filters.date_range && <button onClick={()=>set('date_range',null)} className="text-xs text-red-500 hover:underline whitespace-nowrap">Clear</button>}
              </div>
            </div>
          )}

          {/* Checkbox groups */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {opts?.units?.length > 0 && (
              <CheckboxGroup label={`Units (${opts.units.length})`} options={opts.units}
                selected={filters.units} onChange={v=>set('units',v)}/>
            )}
            {opts?.call_types?.length > 0 && (
              <CheckboxGroup label="Call Types" options={opts.call_types}
                selected={filters.call_types} onChange={v=>set('call_types',v)}/>
            )}
            {opts?.municipalities?.length > 0 && (
              <CheckboxGroup label="Municipalities" options={opts.municipalities}
                selected={filters.municipalities} onChange={v=>set('municipalities',v)}/>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button onClick={()=>onApply(filters)} disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {loading ? <RefreshCw size={13} className="animate-spin"/> : <SlidersHorizontal size={13}/>}
              {loading ? 'Applying…' : 'Apply to All Years'}
            </button>
            {hasActive && (
              <button onClick={()=>{onChange(EMPTY_FILTERS); onApply(EMPTY_FILTERS);}}
                className="px-3 py-2 border text-sm text-gray-600 rounded-lg hover:bg-gray-50">Clear All</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const rtFmt = v => {
  if (v == null) return '';
  const m = Math.floor(v); const s = Math.round((v-m)*60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

function CompareCharts({ slots, slotUploads, slotMetrics }) {
  const labels = slotUploads.map(uploadLabel);

  const callVolData = [{ name: 'Total Calls' }, { name: 'Avg Calls/Day' }];
  labels.forEach((lbl, i) => {
    callVolData[0][lbl] = getNestedVal(slotMetrics[slots[i]]||{}, 'call_volume.total_calls');
    callVolData[1][lbl] = getNestedVal(slotMetrics[slots[i]]||{}, 'call_volume.avg_calls_per_day');
  });

  const rtData = [
    { name: 'Avg' },
    { name: 'Median' },
    { name: 'P90' },
    { name: 'Dispatch→Enroute' },
    { name: 'Enroute→Scene' },
  ];
  const rtPaths = ['response_times.mean_minutes','response_times.median_minutes','response_times.p90_minutes','response_times.dispatch_to_enroute_median','response_times.enroute_to_arrival_median'];
  rtPaths.forEach((path, ri) => labels.forEach((lbl, i) => {
    rtData[ri][lbl] = getNestedVal(slotMetrics[slots[i]]||{}, path);
  }));

  const hasData = slots.some(id => slotMetrics[id] && Object.keys(slotMetrics[id]).length > 0);
  if (!hasData) return <div className="bg-white border rounded-xl p-8 text-center text-sm text-gray-400">Loading chart data…</div>;

  const tooltipStyle = CHART.tooltip;

  return (
    <div className="space-y-4">
      {/* Call Volume */}
      <div className="bg-white border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Call Volume</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={callVolData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid}/>
            <XAxis dataKey="name" tick={{ fontSize: 11 }}/>
            <YAxis tick={{ fontSize: 10 }}/>
            <Tooltip contentStyle={tooltipStyle}/>
            <Legend wrapperStyle={{ fontSize: 11 }}/>
            {labels.map((lbl, i) => <Bar key={i} dataKey={lbl} fill={SLOT_COLORS[i]} radius={[4,4,0,0]}/>)}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Response Times */}
      <div className="bg-white border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Response Time Breakdown <span className="text-xs font-normal text-gray-400">(minutes)</span></h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={rtData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid}/>
            <XAxis dataKey="name" tick={{ fontSize: 10 }}/>
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}m`}/>
            <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [rtFmt(v), n]}/>
            <Legend wrapperStyle={{ fontSize: 11 }}/>
            {labels.map((lbl, i) => <Bar key={i} dataKey={lbl} fill={SLOT_COLORS[i]} radius={[4,4,0,0]}/>)}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function OverlapsModal({ onClose }) {
  const [data, setData] = useState(null);
  const [err, setErr]   = useState('');
  useEffect(() => {
    dataUploads.getCombinedOverlaps(2000).then(setData).catch(e => setErr(e.message || 'Failed to load'));
  }, []);
  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between px-5 py-3 border-b gap-4">
          <div>
            <h3 className="font-bold text-gray-900">Overlapping rows removed</h3>
            <p className="text-xs text-gray-500 mt-0.5 max-w-2xl">
              These unit-responses appeared in more than one dataset. When exports overlap in time the
              same record shows up in each file, so we keep the first copy and drop the rest — matched on
              call id + unit + dispatch time — so calls aren&apos;t double-counted.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none flex-shrink-0">×</button>
        </div>
        <div className="overflow-auto p-4">
          {err && <p className="text-sm text-red-600">{err}</p>}
          {!data && !err && <p className="text-sm text-gray-500">Loading…</p>}
          {data && (
            <>
              <p className="text-xs text-gray-500 mb-2">
                {Number(data.total || 0).toLocaleString()} removed total
                {data.shown < data.total ? ` — showing first ${Number(data.shown).toLocaleString()}` : ''}.
              </p>
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase tracking-wide sticky top-0">
                  <tr>
                    {['Call ID', 'Unit', 'Dispatch time', 'From file', 'Duplicate of'].map(h => (
                      <th key={h} className="px-2 py-1.5 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data.removed || []).map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-2 py-1.5 font-medium text-gray-800">{r.incident ?? '—'}</td>
                      <td className="px-2 py-1.5 text-gray-600">{r.unit ?? '—'}</td>
                      <td className="px-2 py-1.5 text-gray-600">{r.dispatch_time ?? '—'}</td>
                      <td className="px-2 py-1.5 text-gray-600 truncate max-w-[160px]" title={r.from_file}>{r.from_file}</td>
                      <td className="px-2 py-1.5 text-gray-600 truncate max-w-[160px]" title={r.duplicate_of_file}>{r.duplicate_of_file ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PortalDashboardPage() {
  const [uploads, setUploads]     = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [dashLoading, setDashLoading] = useState(false);
  const [error, setError]         = useState('');
  const [dashTab, setDashTab]     = useState('overview');
  const [overlapsOpen, setOverlapsOpen] = useState(false);

  // Compare mode
  const [compareMode, setCompareMode]   = useState(false);
  const [slots, setSlots]               = useState([]);   // array of uploadIds
  const [slotMetrics, setSlotMetrics]   = useState({});   // { uploadId: metrics }
  const [filters, setFilters]           = useState(EMPTY_FILTERS);
  const [filterLoading, setFilterLoading] = useState(false);
  // Filters the Overview dashboard currently has applied — lifted so AI Insights
  // (a sibling of EMSDashboard) can regenerate against the same filtered data.
  const [appliedFilters, setAppliedFilters] = useState(null);

  useEffect(() => {
    apiFetch('/data/uploads')
      .then(data => {
        const cleaned = (data || []).filter(u => u.upload_status === 'CLEANED');
        setUploads(cleaned);
        if (cleaned.length >= 2) setSelectedId('__combined__');   // default: all datasets combined
        else if (cleaned.length === 1) setSelectedId(cleaned[0].id);
        if (cleaned.length >= 2) setSlots([cleaned[0].id, cleaned[1].id]);
        else if (cleaned.length === 1) setSlots([cleaned[0].id]);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setDashLoading(true);
    setDashboard(null);
    setAppliedFilters(null);   // reset AI scope when switching dataset
    const load = selectedId === '__combined__'
      ? dataUploads.getCombinedDashboard()
      : dataUploads.getDashboard(selectedId);
    load
      .then(d => setDashboard(d))
      .catch(e => setError(e.message || 'Failed to load dashboard'))
      .finally(() => setDashLoading(false));
  }, [selectedId]);

  // Fetch metrics for all compare slots (with optional filters)
  const fetchSlotMetrics = useCallback(async (slotIds, activeFilters) => {
    const hasFilters = activeFilters && (
      activeFilters.units?.length || activeFilters.municipalities?.length ||
      activeFilters.call_types?.length || activeFilters.exclude_interfacility ||
      activeFilters.emergency_only || activeFilters.date_range
    );
    const results = {};
    await Promise.all(slotIds.map(async id => {
      try {
        let data;
        if (hasFilters) {
          data = await dashboardFilter.filter(id, activeFilters);
        } else {
          data = await dataUploads.getDashboard(id);
        }
        results[id] = data?.metrics ?? data ?? {};
      } catch { results[id] = {}; }
    }));
    setSlotMetrics(results);
  }, []);

  useEffect(() => {
    if (!compareMode || slots.length === 0) return;
    fetchSlotMetrics(slots, filters);
  }, [compareMode, slots, fetchSlotMetrics]);

  const handleApplyFilters = useCallback(async (overrideFilters) => {
    const f = overrideFilters || filters;
    setFilterLoading(true);
    await fetchSlotMetrics(slots, f);
    setFilterLoading(false);
  }, [slots, filters, fetchSlotMetrics]);

  if (loading) return <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>;

  const isCombined = selectedId === '__combined__';
  const slotUploads = slots.map(id => uploads.find(u => u.id === id)).filter(Boolean);
  const baseMetrics = slotMetrics[slots[0]] || {};

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your EMS analytics overview</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!compareMode && uploads.length > 1 && (
            <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="__combined__">⊕ Combined — all datasets</option>
              {uploads.map(u => <option key={u.id} value={u.id}>{uploadLabel(u)}</option>)}
            </select>
          )}
          {uploads.length >= 2 && !compareMode && (
            <button onClick={() => { setCompareMode(true); setFilters(EMPTY_FILTERS); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
              <BarChart2 size={15} /> Compare Years
            </button>
          )}
          {compareMode && (
            <button onClick={() => { setCompareMode(false); setSlotMetrics({}); setFilters(EMPTY_FILTERS); }}
              className="flex items-center gap-1.5 px-3 py-2 border text-sm text-gray-600 rounded-lg hover:bg-gray-50">
              <X size={14} /> Exit Compare
            </button>
          )}
        </div>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError('')} />

      {uploads.length === 0 ? (
        <div className="bg-white border rounded-xl p-12 text-center shadow-sm">
          <div className="text-5xl mb-4">📊</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No dashboard is ready yet</h2>
          <p className="text-sm text-gray-500 mb-6">Upload and process an EMSCharts CSV to generate analytics.</p>
          <Link href="/portal/uploads" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium text-sm">
            Upload CSV
          </Link>
        </div>

      ) : compareMode ? (
        <>
          {/* Year slot selectors */}
          <div className="bg-blue-600 text-white rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Select Years to Compare</p>
              {slots.length < Math.min(5, uploads.length) && (
                <button
                  onClick={() => {
                    const used = new Set(slots);
                    const next = uploads.find(u => !used.has(u.id));
                    if (next) setSlots(s => [...s, next.id]);
                  }}
                  className="flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors">
                  <Plus size={12} /> Add Year
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {slots.map((slotId, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: SLOT_COLORS[i] }} />
                  <select value={slotId} onChange={e => setSlots(s => s.map((id, j) => j === i ? e.target.value : id))}
                    className="bg-white text-gray-900 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none min-w-[160px]">
                    {uploads.map(u => <option key={u.id} value={u.id}>{uploadLabel(u)}</option>)}
                  </select>
                  {slots.length > 2 && (
                    <button onClick={() => setSlots(s => s.filter((_, j) => j !== i))}
                      className="text-white/60 hover:text-white transition-colors"><X size={14} /></button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Filter panel */}
          <FilterPanel
            uploadId={slots[0]}
            filters={filters}
            onChange={setFilters}
            onApply={handleApplyFilters}
            loading={filterLoading}
          />

          {/* Multi-year metric table */}
          <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">
                Metric Comparison — {slotUploads.map(uploadLabel).join(' vs ')}
              </h2>
              {filterLoading && <RefreshCw size={13} className="animate-spin text-blue-500" />}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b">
                  <tr className="text-[10px] uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3 text-left font-medium">Metric</th>
                    {slotUploads.map((u, i) => (
                      <th key={i} className="px-4 py-3 text-right font-medium">
                        <span className="inline-flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SLOT_COLORS[i] }} />
                          {uploadLabel(u)}
                        </span>
                      </th>
                    ))}
                    {slotUploads.length >= 2 && (
                      <th className="px-4 py-3 text-right font-medium">vs {uploadLabel(slotUploads[0])}</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {COMPARE_METRICS.map(m => {
                    const vals = slots.map(id => getNestedVal(slotMetrics[id] || {}, m.path));
                    const base = vals[0];
                    return (
                      <tr key={m.label} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-700">{m.label}</td>
                        {vals.map((v, i) => (
                          <td key={`val-${i}`} className="px-4 py-2.5 text-right text-gray-600">{fmtVal(v, m.format)}</td>
                        ))}
                        {slotUploads.length >= 2 && (
                          <td className="px-4 py-2.5 text-right">
                            {vals.slice(1).map((v, i) => {
                              if (base == null || v == null || base === 0) return <span key={i} className="text-gray-400">—</span>;
                              const pct = ((v - base) / base * 100).toFixed(1);
                              const num = parseFloat(pct);
                              const improved = m.lower ? num < 0 : num > 0;
                              const Icon = improved ? TrendingUp : TrendingDown;
                              return (
                                <span key={i} className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ml-1 ${improved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  <Icon size={9} />{num > 0 ? '+' : ''}{pct}%
                                </span>
                              );
                            })}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive charts */}
          <CompareCharts slots={slots} slotUploads={slotUploads} slotMetrics={slotMetrics} />
        </>

      ) : dashLoading ? (
        <div className="space-y-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : dashboard ? (
        isCombined ? (
          <div className="space-y-5">
            {dashboard.pool && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-sm text-indigo-900 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="font-semibold">⊕ Combined view — all datasets</span>
                <span>{dashboard.pool.files_combined} datasets pooled</span>
                {dashboard.pool.date_min && <span>{dashboard.pool.date_min} → {dashboard.pool.date_max}</span>}
                <span>{Number(dashboard.pool.rows_used || 0).toLocaleString()} responses</span>
                {dashboard.pool.deduped > 0 && (
                  <button type="button" onClick={() => setOverlapsOpen(true)}
                    className="text-indigo-600 underline hover:no-underline font-medium">
                    {Number(dashboard.pool.deduped).toLocaleString()} overlapping rows removed
                  </button>
                )}
                {dashboard.pool.files_skipped > 0 && <span className="text-amber-600">{dashboard.pool.files_skipped} incompatible file(s) excluded</span>}
              </div>
            )}
            <PageTabs
              activeTab={dashTab}
              onChange={setDashTab}
              tabs={[
                { id: 'overview',    label: 'Overview',    icon: <LayoutDashboard size={15} /> },
                { id: 'predictions', label: 'Predictions', icon: <TrendingUp size={15} /> },
                { id: 'scheduling',  label: 'Scheduling',  icon: <CalendarClock size={15} /> },
                { id: 'geographic',  label: 'Geographic',  icon: <MapPin size={15} /> },
              ]}
            />
            {(dashTab === 'overview' || !['predictions', 'scheduling', 'geographic'].includes(dashTab)) && (
              <div className="space-y-5">
                <AiInsights combined filters={appliedFilters} />
                <div className="bg-white border rounded-xl shadow-sm p-6">
                  <EMSDashboard metrics={dashboard.metrics} generatedAt={null} uploadId={null}
                    uploadInfo={{ original_filename: 'Combined — all datasets' }}
                    filterApply={(f) => dataUploads.getCombinedDashboardFiltered(f)}
                    filterOptions={() => dataUploads.getCombinedFilterOptions()}
                    onFiltersApplied={setAppliedFilters} />
                </div>
              </div>
            )}
            {dashTab === 'predictions' && <PredictiveAnalytics combined />}
            {dashTab === 'scheduling' && (
              <div className="space-y-5">
                <IftOutlook combined />
                <EmergencyTransportOutlook combined />
              </div>
            )}
            {dashTab === 'geographic' && (
              <div className="space-y-5">
                <StagingRecommender combined />
                <GeographicHeatMap combined />
                <MvaHotspots combined />
              </div>
            )}
            {overlapsOpen && <OverlapsModal onClose={() => setOverlapsOpen(false)} />}
          </div>
        ) : (
        <>
        <PageTabs
          activeTab={dashTab}
          onChange={setDashTab}
          tabs={[
            { id: 'overview',    label: 'Overview',    icon: <LayoutDashboard size={15} /> },
            { id: 'predictions', label: 'Predictions', icon: <TrendingUp size={15} /> },
            { id: 'scheduling',  label: 'Scheduling',  icon: <CalendarClock size={15} /> },
            { id: 'geographic',  label: 'Geographic',  icon: <MapPin size={15} /> },
            { id: 'dateranges',  label: 'Compare Dates', icon: <CalendarRange size={15} /> },
          ]}
        />

        {dashTab === 'overview' && (
          <div className="space-y-5">
          <AiInsights uploadId={selectedId} filters={appliedFilters} />
          <div className="bg-white border rounded-xl shadow-sm p-6">
            <EMSDashboard
              metrics={dashboard.metrics}
              generatedAt={dashboard.generated_at}
              uploadId={selectedId}
              uploadInfo={uploads.find(u => u.id === selectedId)}
              onFiltersApplied={setAppliedFilters}
              onRefresh={() => {
                setDashLoading(true);
                dataUploads.getDashboard(selectedId).then(setDashboard).finally(() => setDashLoading(false));
              }}
            />
            <div className="mt-4 pt-4 border-t flex justify-end">
              <Link href={`/portal/data-explorer/${selectedId}`} className="text-sm bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-4 py-2 rounded-lg font-medium">
                🔍 Explore Full Dataset
              </Link>
            </div>
          </div>
          </div>
        )}

        {dashTab === 'predictions' && (
          <div className="space-y-5">
            <PredictiveAnalytics uploadId={selectedId} />
            <TurnoverRisk uploadId={selectedId} />
            <WeatherTrafficForecast uploadId={selectedId} />
          </div>
        )}

        {dashTab === 'scheduling' && (
          <div className="space-y-5">
            <IftOutlook uploadId={selectedId} />
            <EmergencyTransportOutlook uploadId={selectedId} />
          </div>
        )}

        {dashTab === 'geographic' && (
          <div className="space-y-5">
            <StagingRecommender uploadId={selectedId} />
            <GeographicHeatMap uploadId={selectedId} />
            <MvaHotspots uploadId={selectedId} />
          </div>
        )}

        {dashTab === 'dateranges' && (
          <div className="space-y-5">
            <DateRangeCompare />
          </div>
        )}
        </>
        )
      ) : null}
    </div>
  );
}
