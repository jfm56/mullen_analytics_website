'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

// ── Constants ─────────────────────────────────────────────────────────────────
const API          = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const DOW_NAMES    = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const NFPA_TOTAL_S = 300;  // 5 min = NFPA 1710 BLS target (dispatch→scene)
const PAGE_SIZE    = 50;

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtS(s) {
  if (s == null || isNaN(s)) return '—';
  const secs = Math.round(Number(s));
  return `${Math.floor(secs / 60)}m ${String(secs % 60).padStart(2, '0')}s`;
}

function pctile(arr, p) {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)];
}

function med(arr) { return pctile(arr, 0.5); }

// ── Inline chart components ───────────────────────────────────────────────────

function BarChart({ data, accentColor = '#3b82f6', maxBars = 20, activeKey, onSelect }) {
  if (!data || data.length === 0) return <p className="text-xs text-slate-500 italic py-4">No data</p>;
  const sliced  = data.slice(0, maxBars);
  const maxVal  = Math.max(...sliced.map(d => d.v), 1);
  const cellW   = 100 / sliced.length;
  return (
    <div className="w-full overflow-x-auto">
      <div style={{ display: 'flex', alignItems: 'flex-end', height: 160, gap: 3, minWidth: sliced.length * 28 }}>
        {sliced.map(d => {
          const barH  = Math.max(4, (d.v / maxVal) * 130);
          const isOn  = activeKey == null || activeKey === d.k;
          const label = String(d.k).length > 6 ? String(d.k).slice(0, 5) + '…' : String(d.k);
          return (
            <div key={d.k} className="flex flex-col items-center" style={{ flex: `0 0 ${cellW}%`, minWidth: 22, cursor: onSelect ? 'pointer' : 'default' }}
              onClick={() => onSelect?.(d.k)} title={`${d.k}: ${d.v}`}>
              <span style={{ fontSize: 8, color: '#64748b', marginBottom: 2 }}>
                {d.v >= 1000 ? `${(d.v / 1000).toFixed(1)}k` : d.v}
              </span>
              <div style={{ width: '100%', height: barH, backgroundColor: isOn ? accentColor : '#1e3050', borderRadius: 3, opacity: isOn ? 1 : 0.35 }} />
              <span style={{ fontSize: 8, color: '#475569', marginTop: 3, textAlign: 'center', lineHeight: 1.2 }}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LineChart({ data, color = '#3b82f6', height = 140 }) {
  if (!data || data.length < 2) return <p className="text-xs text-slate-500 italic py-4">Not enough data</p>;
  const W = 500; const H = height - 24;
  const vals   = data.map(d => d.v);
  const maxVal = Math.max(...vals, 1);
  const minVal = Math.min(...vals, 0);
  const range  = maxVal - minVal || 1;
  const xs     = data.map((_, i) => (i / (data.length - 1)) * W);
  const ys     = data.map(d => H - ((d.v - minVal) / range) * (H - 10) - 5);
  const line   = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const area   = `M ${xs[0].toFixed(1)},${H} ${xs.map((x, i) => `L ${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')} L ${xs[xs.length - 1].toFixed(1)},${H} Z`;
  const gradId = `lg${color.replace('#', '')}`;
  const step   = Math.ceil(data.length / 8);
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {data.map((d, i) => i % step === 0 || i === data.length - 1 ? (
        <text key={i} x={xs[i].toFixed(1)} y={height - 2} textAnchor="middle" fill="#475569" fontSize={8} fontFamily="monospace">
          {String(d.label).slice(0, 7)}
        </text>
      ) : null)}
    </svg>
  );
}

function HeatmapGrid({ matrix, days, hours }) {
  if (!matrix || matrix.length === 0) return (
    <p className="text-xs text-slate-500 italic py-4">No heatmap data — re-run the pipeline to generate it.</p>
  );
  const maxVal = Math.max(...matrix.flat(), 1);
  function cellColor(v) {
    if (v === 0) return '#0a111e';
    const t = v / maxVal;
    if (t < 0.15) return '#1e3a5f';
    if (t < 0.35) return '#1d4ed8';
    if (t < 0.55) return '#3b82f6';
    if (t < 0.75) return '#60a5fa';
    return '#93c5fd';
  }
  return (
    <div className="overflow-x-auto">
      <div style={{ display: 'grid', gridTemplateColumns: `40px repeat(${hours.length}, 1fr)`, gap: 2, minWidth: 600 }}>
        <div />
        {hours.map(h => (
          <div key={h} style={{ fontSize: 8, textAlign: 'center', color: '#475569', fontFamily: 'monospace', paddingBottom: 3 }}>
            {h % 6 === 0 ? `${h}h` : ''}
          </div>
        ))}
        {days.flatMap((day, di) => [
          <div key={`dl-${day}`} style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace', display: 'flex', alignItems: 'center' }}>{day}</div>,
          ...hours.map((_, hi) => {
            const v = matrix[di]?.[hi] ?? 0;
            return (
              <div key={`${di}-${hi}`} title={`${day} ${hi}:00 — ${v} calls`}
                style={{ backgroundColor: cellColor(v), height: 20, borderRadius: 2 }} />
            );
          }),
        ])}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <span style={{ fontSize: 10, color: '#64748b' }}>0</span>
        {['#1e3a5f', '#1d4ed8', '#3b82f6', '#60a5fa', '#93c5fd'].map(c => (
          <div key={c} style={{ backgroundColor: c, width: 20, height: 8, borderRadius: 2 }} />
        ))}
        <span style={{ fontSize: 10, color: '#64748b' }}>{maxVal} calls</span>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function InteractiveDashboard() {
  const { agencyId, runId } = useParams();

  const [report,    setReport]    = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [incPage,   setIncPage]   = useState(0);
  const [filters,   setFilters]   = useState({
    unit: '', incidentType: '', dayOfWeek: '', dateStart: '', dateEnd: '',
  });

  function setFilter(key, val) { setFilters(f => ({ ...f, [key]: val })); setIncPage(0); }
  function clearFilters()      { setFilters({ unit: '', incidentType: '', dayOfWeek: '', dateStart: '', dateEnd: '' }); setIncPage(0); }

  useEffect(() => {
    if (!agencyId || !runId) return;
    const opts = { credentials: 'include' };
    Promise.all([
      fetch(`${API}/agencies/${agencyId}/pipeline/runs/${runId}/report`, opts),
      fetch(`${API}/agencies/${agencyId}/pipeline/runs/${runId}/incidents`, opts),
    ]).then(async ([r1, r2]) => {
      if (!r1.ok) throw new Error(`Report ${r1.status}`);
      const rp   = await r1.json();
      const rows = r2.ok ? (await r2.json()).rows || [] : [];
      setReport(rp);
      setIncidents(rows);
      setLoading(false);
    }).catch(e => { setError(e.message); setLoading(false); });
  }, [agencyId, runId]);

  // ── All hooks must run before any conditional returns ─────────────────────
  const unitOptions = useMemo(() => {
    const s = new Set(incidents.map(r => r.unit).filter(Boolean));
    return Array.from(s).sort();
  }, [incidents]);

  const typeOptions = useMemo(() => {
    const s = new Set(incidents.map(r => r.cat).filter(Boolean));
    return Array.from(s).sort();
  }, [incidents]);

  const filtered = useMemo(() => {
    let d = incidents;
    if (filters.unit)          d = d.filter(r => r.unit === filters.unit);
    if (filters.incidentType)  d = d.filter(r => r.cat  === filters.incidentType);
    if (filters.dayOfWeek !== '') d = d.filter(r => r.dow === Number(filters.dayOfWeek));
    if (filters.dateStart)     d = d.filter(r => r.ts && r.ts >= filters.dateStart);
    if (filters.dateEnd)       d = d.filter(r => r.ts && r.ts <= filters.dateEnd + 'T23:59:59');
    return d;
  }, [incidents, filters]);

  const activeCount = useMemo(() => Object.values(filters).filter(v => v !== '').length, [filters]);

  const kpis = useMemo(() => {
    const rps = filtered.map(r => r.rp).filter(v => v != null && v >= 0 && v <= 7200);
    return {
      total:    filtered.length,
      p90:      pctile(rps, 0.9),
      medRp:    med(rps),
      nfpaPct:  rps.length ? rps.filter(v => v <= NFPA_TOTAL_S).length / rps.length * 100 : null,
      units:    new Set(filtered.map(r => r.unit).filter(Boolean)).size,
    };
  }, [filtered]);

  const heatmapData = useMemo(() => {
    const reportHm = report?.modules?.call_volume?.heatmap;
    if (filtered.length === incidents.length && reportHm) return reportHm;
    const matrix = Array.from({ length: 7 }, () => Array(24).fill(0));
    filtered.forEach(r => { if (r.dow != null && r.hr != null) matrix[r.dow][r.hr]++; });
    return { days: DOW_NAMES, hours: Array.from({ length: 24 }, (_, i) => i), matrix };
  }, [filtered, incidents.length, report]);

  const callTrend = useMemo(() => {
    const m = {};
    filtered.forEach(r => { if (r.ts) { const k = r.ts.slice(0, 7); m[k] = (m[k] || 0) + 1; } });
    return Object.entries(m).sort(([a], [b]) => a < b ? -1 : 1).map(([k, v]) => ({ k, label: k, v }));
  }, [filtered]);

  const rtTrend = useMemo(() => {
    const m = {};
    filtered.forEach(r => { if (r.ts && r.rp != null) { const k = r.ts.slice(0, 7); (m[k] = m[k] || []).push(r.rp); } });
    return Object.entries(m).sort(([a], [b]) => a < b ? -1 : 1)
      .map(([k, arr]) => {
        const clean = arr.filter(v => v >= 0 && v <= 7200);
        return { k, label: k, v: Math.round(med(clean) ?? 0) };
      }).filter(d => d.v > 0);
  }, [filtered]);

  const catCounts = useMemo(() => {
    const m = {};
    filtered.forEach(r => { if (r.cat) m[r.cat] = (m[r.cat] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => ({ k, v }));
  }, [filtered]);

  const dowCounts = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const k = DOW_NAMES[i];
      return { k, v: filtered.filter(r => r.dow === i).length };
    }), [filtered]);

  const unitStats = useMemo(() => {
    const m = {};
    filtered.forEach(r => {
      if (!r.unit) return;
      const s = m[r.unit] = m[r.unit] || { calls: 0, rps: [], trs: [] };
      s.calls++;
      if (r.rp != null && r.rp >= 0 && r.rp <= 7200) s.rps.push(r.rp);
      if (r.tr != null && r.tr >= 0 && r.tr <= 3600) s.trs.push(r.tr);
    });
    return Object.entries(m).map(([unit, s]) => ({
      unit,
      calls:    s.calls,
      medRp:    med(s.rps),
      p90Rp:    pctile(s.rps, 0.9),
      nfpaPct:  s.rps.length ? s.rps.filter(v => v <= NFPA_TOTAL_S).length / s.rps.length * 100 : null,
      medTr:    med(s.trs),
    })).sort((a, b) => b.calls - a.calls);
  }, [filtered]);

  const muniData = useMemo(() => {
    const munis = report?.modules?.municipality?.municipalities || {};
    return Object.entries(munis)
      .map(([name, d]) => ({ name, calls: d.calls, p90: d.response_p90, nfpa: d.nfpa_compliance_pct }))
      .sort((a, b) => b.calls - a.calls);
  }, [report]);

  const pagedIncidents = useMemo(() => {
    const start = incPage * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, incPage]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  // ── Loading / error states ────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-[#060d1a] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-400">Loading dashboard…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#060d1a] flex items-center justify-center p-8">
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 max-w-md text-center">
        <p className="text-base font-bold text-red-300 mb-2">Could not load dashboard data</p>
        <p className="text-sm text-slate-400 mb-4">{error}</p>
        <Link href={`/platform/${agencyId}/analytics/${runId}`}
          className="text-sm text-blue-400 hover:text-blue-300 underline">
          ← Back to report
        </Link>
      </div>
    </div>
  );

  const km          = report?.key_metrics || {};
  const agencyName  = report?.agency_name || 'Agency';
  const hasHeatmap  = Boolean(report?.modules?.call_volume?.heatmap);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#060d1a] text-white">

      {/* ── Nav bar ──────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-[#070e1f]/95 border-b border-[#1e3050] backdrop-blur-sm px-6 py-3 flex items-center gap-4">
        <Link href={`/platform/${agencyId}/analytics/${runId}`}
          className="text-sm text-slate-400 hover:text-white transition-colors">
          ← Report
        </Link>
        <span className="text-slate-700">|</span>
        <h1 className="text-sm font-bold text-white">{agencyName} — Interactive Dashboard</h1>
        <span className="text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full uppercase tracking-wider font-bold">
          Cross-filter
        </span>
        <span className="ml-auto text-xs text-slate-500">
          {incidents.length.toLocaleString()} incidents
          {activeCount > 0 && ` · ${filtered.length.toLocaleString()} shown`}
        </span>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Filter bar ─────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-[#1e3050] bg-[#0d1627] px-5 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { key: 'unit', label: 'Unit', opts: unitOptions, placeholder: 'All units' },
              { key: 'incidentType', label: 'Incident Type', opts: typeOptions, placeholder: 'All types' },
            ].map(({ key, label, opts, placeholder }) => (
              <div key={key}>
                <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">{label}</label>
                <select value={filters[key]} onChange={e => setFilter(key, e.target.value)}
                  className="w-full bg-[#060d1a] border border-[#1e3050] text-white text-xs rounded-lg px-2 py-1.5">
                  <option value="">{placeholder}</option>
                  {opts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Day of Week</label>
              <select value={filters.dayOfWeek} onChange={e => setFilter('dayOfWeek', e.target.value)}
                className="w-full bg-[#060d1a] border border-[#1e3050] text-white text-xs rounded-lg px-2 py-1.5">
                <option value="">All days</option>
                {DOW_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Date From</label>
              <input type="date" value={filters.dateStart} onChange={e => setFilter('dateStart', e.target.value)}
                className="w-full bg-[#060d1a] border border-[#1e3050] text-white text-xs rounded-lg px-2 py-1.5" />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Date To</label>
              <input type="date" value={filters.dateEnd} onChange={e => setFilter('dateEnd', e.target.value)}
                className="w-full bg-[#060d1a] border border-[#1e3050] text-white text-xs rounded-lg px-2 py-1.5" />
            </div>
            <div className="flex items-end">
              {activeCount > 0 ? (
                <button onClick={clearFilters}
                  className="w-full text-xs px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 rounded-lg transition-colors">
                  Clear {activeCount} filter{activeCount > 1 ? 's' : ''}
                </button>
              ) : (
                <span className="text-xs text-slate-600 italic">No active filters</span>
              )}
            </div>
          </div>
        </div>

        {/* ── KPI cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Calls',   value: kpis.total.toLocaleString(),
              sub:   activeCount > 0 ? `of ${incidents.length.toLocaleString()} total` : (km.date_range_start ? `${km.date_range_start} → ${km.date_range_end}` : null),
              color: 'text-white' },
            { label: 'P90 Response',  value: fmtS(kpis.p90), sub: 'dispatch → scene',
              color: kpis.p90 == null ? 'text-slate-500' : kpis.p90 <= 300 ? 'text-emerald-400' : kpis.p90 <= 480 ? 'text-amber-400' : 'text-red-400' },
            { label: 'NFPA ≤5 min',  value: kpis.nfpaPct != null ? `${kpis.nfpaPct.toFixed(1)}%` : '—',
              sub:   'NFPA 1710 target: ≥90%',
              color: kpis.nfpaPct == null ? 'text-slate-500' : kpis.nfpaPct >= 90 ? 'text-emerald-400' : kpis.nfpaPct >= 70 ? 'text-amber-400' : 'text-red-400' },
            { label: 'Units Active',  value: kpis.units, sub: 'in filtered window', color: 'text-white' },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="rounded-xl border border-[#1e3050] bg-[#0d1627] px-5 py-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{label}</p>
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
              {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
            </div>
          ))}
        </div>

        {/* ── Hour × Day Heatmap ──────────────────────────────────────────── */}
        <div className="rounded-xl border border-[#1e3050] bg-[#0d1627] p-6">
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Hour × Day Call Volume</h2>
            {activeCount > 0 && <span className="text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full">filtered</span>}
            {!hasHeatmap && (
              <span className="ml-auto text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
                Re-run pipeline for pre-computed heatmap
              </span>
            )}
          </div>
          <HeatmapGrid matrix={heatmapData.matrix} days={heatmapData.days} hours={heatmapData.hours} />
        </div>

        {/* ── Trend charts ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-[#1e3050] bg-[#0d1627] p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Monthly Call Volume</h2>
            <LineChart data={callTrend} color="#3b82f6" />
          </div>
          <div className="rounded-xl border border-[#1e3050] bg-[#0d1627] p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Monthly Median Response Time</h2>
            <LineChart data={rtTrend} color="#8b5cf6" />
            {rtTrend.length > 0 && <p className="text-[10px] text-slate-600 mt-2">Values are median total response (dispatch → scene) in seconds. NFPA 1710 target: 300s.</p>}
          </div>
        </div>

        {/* ── Distribution charts ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-[#1e3050] bg-[#0d1627] p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Calls by Incident Type</h2>
            <BarChart data={catCounts} accentColor="#f59e0b" maxBars={12}
              activeKey={filters.incidentType || null}
              onSelect={v => setFilter('incidentType', filters.incidentType === v ? '' : v)} />
            <p className="text-[10px] text-slate-600 mt-2">Click a bar to filter by incident type.</p>
          </div>
          <div className="rounded-xl border border-[#1e3050] bg-[#0d1627] p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Calls by Day of Week</h2>
            <BarChart data={dowCounts} accentColor="#10b981" maxBars={7}
              activeKey={filters.dayOfWeek !== '' ? DOW_NAMES[Number(filters.dayOfWeek)] : null}
              onSelect={v => {
                const idx = DOW_NAMES.indexOf(v);
                if (idx < 0) return;
                setFilter('dayOfWeek', filters.dayOfWeek === String(idx) ? '' : String(idx));
              }} />
            <p className="text-[10px] text-slate-600 mt-2">Click a bar to filter by day of week.</p>
          </div>
        </div>

        {/* ── Unit performance table ───────────────────────────────────────── */}
        {unitStats.length > 0 && (
          <div className="rounded-xl border border-[#1e3050] bg-[#0d1627] p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Unit Performance</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1e3050]">
                    {['Unit', 'Calls', 'Median RT', 'P90 RT', 'NFPA ≤5min', 'Median Travel'].map(h => (
                      <th key={h} className="pb-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0d1627]">
                  {unitStats.map(u => (
                    <tr key={u.unit}
                      onClick={() => setFilter('unit', filters.unit === u.unit ? '' : u.unit)}
                      className={`cursor-pointer transition-colors ${filters.unit === u.unit ? 'bg-blue-500/10' : 'hover:bg-[#1e3050]/30'}`}>
                      <td className="py-3 pr-4 font-bold text-white">
                        {u.unit}
                        {filters.unit === u.unit && <span className="ml-2 text-[10px] text-blue-400">●</span>}
                      </td>
                      <td className="py-3 pr-4 text-slate-300">{u.calls.toLocaleString()}</td>
                      <td className="py-3 pr-4 text-slate-300 font-mono text-xs">{fmtS(u.medRp)}</td>
                      <td className={`py-3 pr-4 font-mono text-xs ${u.p90Rp != null && u.p90Rp > NFPA_TOTAL_S ? 'text-amber-400' : 'text-slate-300'}`}>{fmtS(u.p90Rp)}</td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs font-bold ${
                          u.nfpaPct == null ? 'text-slate-600' :
                          u.nfpaPct >= 90 ? 'text-emerald-400' :
                          u.nfpaPct >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
                          {u.nfpaPct != null ? `${u.nfpaPct.toFixed(1)}%` : '—'}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400 font-mono text-xs">{fmtS(u.medTr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-slate-600 mt-3">Click a row to filter all charts to that unit.</p>
          </div>
        )}

        {/* ── Municipality table ───────────────────────────────────────────── */}
        {muniData.length > 0 && (
          <div className="rounded-xl border border-[#1e3050] bg-[#0d1627] p-6">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Municipality Breakdown</h2>
              <span className="text-[10px] text-slate-600 italic ml-2">from report — unaffected by incident filters</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1e3050]">
                    {['Municipality', 'Calls', 'P90 Response', 'NFPA Compliance'].map(h => (
                      <th key={h} className="pb-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0a111e]">
                  {muniData.slice(0, 20).map(m => (
                    <tr key={m.name} className="hover:bg-[#1e3050]/20 transition-colors">
                      <td className="py-3 pr-4 font-medium text-white">{m.name}</td>
                      <td className="py-3 pr-4 text-slate-300">{(m.calls || 0).toLocaleString()}</td>
                      <td className="py-3 pr-4 text-slate-300 font-mono text-xs">{fmtS(m.p90)}</td>
                      <td className="py-3">
                        <span className={`text-xs font-bold ${
                          m.nfpa == null ? 'text-slate-600' :
                          m.nfpa >= 90 ? 'text-emerald-400' :
                          m.nfpa >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
                          {m.nfpa != null ? `${typeof m.nfpa === 'number' ? m.nfpa.toFixed(1) : m.nfpa}%` : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Incident drill-down ──────────────────────────────────────────── */}
        <div className="rounded-xl border border-[#1e3050] bg-[#0d1627] p-6">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Incident Drill-Down</h2>
            <span className="text-xs text-slate-500">{filtered.length.toLocaleString()} rows</span>
            <div className="ml-auto flex items-center gap-2">
              <button disabled={incPage === 0} onClick={() => setIncPage(p => p - 1)}
                className="text-xs px-3 py-1 rounded-lg border border-[#1e3050] text-slate-400 disabled:opacity-30 hover:bg-[#1e3050] transition-colors">
                ← Prev
              </button>
              <span className="text-xs text-slate-500">{incPage + 1} / {Math.max(1, totalPages)}</span>
              <button disabled={incPage >= totalPages - 1} onClick={() => setIncPage(p => p + 1)}
                className="text-xs px-3 py-1 rounded-lg border border-[#1e3050] text-slate-400 disabled:opacity-30 hover:bg-[#1e3050] transition-colors">
                Next →
              </button>
            </div>
          </div>
          {incidents.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No incident-level data available. Re-run the pipeline to generate it.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#1e3050]">
                    {['Time', 'Unit', 'Type', 'Total RT', 'Turnout', 'Travel'].map(h => (
                      <th key={h} className="pb-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0a111e]">
                  {pagedIncidents.map((r, idx) => (
                    <tr key={`${r.ts ?? ''}-${idx}`} className="hover:bg-[#1e3050]/20">
                      <td className="py-2 pr-4 font-mono text-slate-400">{r.ts ? r.ts.slice(0, 16).replace('T', ' ') : '—'}</td>
                      <td className="py-2 pr-4 text-white font-medium">{r.unit || '—'}</td>
                      <td className="py-2 pr-4 text-slate-300">{r.cat || '—'}</td>
                      <td className={`py-2 pr-4 font-mono ${r.rp != null && r.rp > NFPA_TOTAL_S ? 'text-amber-400' : 'text-slate-300'}`}>{fmtS(r.rp)}</td>
                      <td className="py-2 pr-4 font-mono text-slate-400">{fmtS(r.to)}</td>
                      <td className="py-2 font-mono text-slate-400">{fmtS(r.tr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
