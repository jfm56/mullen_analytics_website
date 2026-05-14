'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

// ── UTILITIES ────────────────────────────────────────────────────────────────
function fmtSec(s) {
  if (s == null) return '—';
  const m = Math.floor(s / 60), r = Math.round(s % 60);
  return m > 0 ? `${m}m ${String(r).padStart(2, '0')}s` : `${r}s`;
}


// ── KPI CARD ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, benchmark, status = 'neutral', trend, insight, large }) {
  const borders = { critical: 'border-red-500/60 bg-red-500/8 shadow-lg shadow-red-500/10', warning: 'border-amber-500/60 bg-amber-500/8 shadow-lg shadow-amber-500/10', good: 'border-emerald-500/60 bg-emerald-500/8 shadow-lg shadow-emerald-500/10', neutral: 'border-[#1e3050] bg-[#0d1627]' };
  const vals    = { critical: 'text-red-400', warning: 'text-amber-400', good: 'text-emerald-400', neutral: 'text-white' };
  const badges  = { critical: { text: 'CRITICAL', bg: 'bg-red-500/25 text-red-300 border border-red-500/50' }, warning: { text: 'CAUTION', bg: 'bg-amber-500/25 text-amber-300 border border-amber-500/50' }, good: { text: 'ON TARGET', bg: 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50' }, neutral: null };
  const badge = badges[status];
  return (
    <div className={`rounded-xl border p-6 flex flex-col gap-3 ${borders[status]}`}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</p>
        {badge && <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-widest ${badge.bg}`}>{badge.text}</span>}
      </div>
      <div className="flex items-end gap-2">
        <p className={`font-bold leading-none ${large ? 'text-5xl' : 'text-4xl'} ${vals[status]}`}>{value ?? '—'}</p>
        {trend && <span className={`text-base font-bold pb-1 ${trend.startsWith('▲') ? 'text-red-400' : 'text-emerald-400'}`}>{trend}</span>}
      </div>
      {benchmark && <p className="text-sm text-slate-300 font-medium">Target: {benchmark}</p>}
      {sub && <p className="text-sm text-slate-400">{sub}</p>}
      {insight && <p className="text-sm text-white border-t border-white/10 pt-3 mt-1 font-medium">{insight}</p>}
    </div>
  );
}

// ── DARK BAR CHART ────────────────────────────────────────────────────────────
function DarkBarChart({ data, maxBars = 12, accent = '#3b82f6', activeKey, onSelect }) {
  if (!data || Object.keys(data).length === 0) {
    return <p className="text-xs text-slate-500 py-4 text-center">No data available</p>;
  }
  const entries = Object.entries(data).map(([k, v]) => [k, Number(v)]).sort((a, b) => b[1] - a[1]).slice(0, maxBars);
  const max = Math.max(...entries.map(([, v]) => v), 1);
  return (
    <div className="space-y-2">
      {entries.map(([label, val]) => {
        const isActive = !!activeKey && activeKey === label;
        const isDimmed = !!activeKey && activeKey !== label;
        return (
          <div key={label}
            className={`flex items-center gap-3 rounded-lg px-2 py-1.5 transition-all
              ${onSelect ? 'cursor-pointer hover:bg-white/5' : ''}
              ${isActive ? 'bg-white/8 ring-1 ring-inset ring-white/20' : ''}`}
            onClick={() => onSelect && onSelect(isActive ? '' : label)}
          >
            <span className={`text-sm w-40 truncate shrink-0 transition-colors ${isActive ? 'text-white font-semibold' : 'text-slate-300'}`}>{label}</span>
            <div className="flex-1 h-6 bg-slate-800/80 rounded overflow-hidden relative">
              <div className="h-full rounded transition-all"
                style={{ width: `${(val / max) * 100}%`, background: isDimmed ? `${accent}40` : accent }} />
              <span className="absolute right-2 top-1 text-xs text-slate-200 font-medium">{((val / max) * 100).toFixed(0)}%</span>
            </div>
            <span className={`text-sm w-16 text-right shrink-0 font-bold transition-colors tabular-nums ${isActive ? 'text-white' : 'text-slate-200'}`}>{val.toLocaleString()}</span>
          </div>
        );
      })}
      {activeKey && onSelect && (
        <p className="text-sm text-blue-400 text-right mt-2 cursor-pointer hover:text-blue-300 font-medium" onClick={() => onSelect('')}>✕ Clear filter</p>
      )}
    </div>
  );
}

// ── DARK FORECAST CHART ──────────────────────────────────────────────────────
function DarkForecastChart({ historical, forecastMonths, forecastValues, forecastLower, forecastUpper }) {
  if (!forecastMonths?.length) return <p className="text-xs text-slate-500 py-4 text-center">No forecast data</p>;
  const histEntries = Object.entries(historical || {});
  const allValues = [...histEntries.map(([, v]) => v), ...forecastValues, ...forecastUpper].filter(Boolean);
  const max = Math.max(...allValues, 1);
  return (
    <div className="space-y-2">
      {histEntries.map(([month, val]) => (
        <div key={month} className="flex items-center gap-3">
          <span className="text-sm text-slate-400 w-16 shrink-0 text-right font-medium">{month.slice(2)}</span>
          <div className="flex-1 h-4 bg-slate-800 rounded overflow-hidden">
            <div className="h-full bg-blue-500 rounded" style={{ width: `${(val / max) * 100}%` }} />
          </div>
          <span className="text-sm text-slate-300 w-10 text-right shrink-0 tabular-nums font-medium">{val}</span>
        </div>
      ))}
      <div className="flex items-center gap-3 py-1">
        <span className="w-16 shrink-0" />
        <div className="flex-1 border-t border-dashed border-blue-500/40" />
        <span className="text-sm text-blue-400 shrink-0 font-medium">forecast →</span>
      </div>
      {forecastMonths.map((month, i) => {
        const val = forecastValues[i] ?? 0;
        const lower = forecastLower[i] ?? 0;
        const upper = forecastUpper[i] ?? val;
        const lPct = (lower / max) * 100;
        const wPct = ((upper - lower) / max) * 100;
        const pPct = (val / max) * 100;
        return (
          <div key={month} className="flex items-center gap-3">
            <span className="text-sm text-blue-400 w-16 shrink-0 text-right font-medium">{month.slice(2)}</span>
            <div className="flex-1 h-4 bg-slate-800 rounded overflow-hidden relative">
              <div className="absolute h-full bg-blue-500/20 rounded" style={{ left: `${lPct}%`, width: `${Math.max(wPct, 1)}%` }} />
              <div className="absolute h-full bg-blue-400/60 rounded" style={{ width: `${pPct}%` }} />
            </div>
            <span className="text-sm text-blue-400 w-10 text-right shrink-0 tabular-nums font-medium">{Math.round(val)}</span>
          </div>
        );
      })}
      <div className="flex gap-6 mt-4 text-sm text-slate-400">
        <span className="flex items-center gap-2"><span className="inline-block w-4 h-3 bg-blue-500 rounded-sm" /> Historical</span>
        <span className="flex items-center gap-2"><span className="inline-block w-4 h-3 bg-blue-400/60 rounded-sm" /> Forecast</span>
        <span className="flex items-center gap-2"><span className="inline-block w-4 h-3 bg-blue-500/20 rounded-sm" /> 80% interval</span>
      </div>
    </div>
  );
}

// ── RESPONSE TIME ROW ─────────────────────────────────────────────────────────
function RtRow({ label, value, target, isKey }) {
  if (!value && value !== 0) return null;
  const over = target != null && value > target;
  return (
    <div className={`flex items-center justify-between py-3.5 border-b border-white/5 last:border-0 ${isKey ? 'bg-white/5 -mx-3 px-3 rounded-lg' : ''}`}>
      <span className="text-base text-slate-300 font-medium">{label}</span>
      <div className="flex items-center gap-3">
        {target != null && <span className="text-xs text-slate-500">target {fmtSec(target)}</span>}
        <span className={`font-bold text-base ${over ? 'text-red-400' : isKey ? 'text-white' : 'text-slate-100'}`}>{fmtSec(value)}</span>
        {over && <span className="text-xs text-red-400 font-semibold">▲ +{fmtSec(value - target)}</span>}
      </div>
    </div>
  );
}

// ── SECTION LABEL ─────────────────────────────────────────────────────────────
function SectionLabel({ title, sub, badge }) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="flex-1">
        <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
        {sub && <p className="text-sm text-slate-400 mt-1">{sub}</p>}
      </div>
      {badge && (
        <span className="text-xs px-3 py-1 rounded-full font-bold uppercase tracking-widest bg-violet-500/20 text-violet-300 border border-violet-500/30 shrink-0">
          {badge}
        </span>
      )}
    </div>
  );
}

// ── RISK SCORE ────────────────────────────────────────────────────────────────
function calcRiskScore(stats, avgCalls) {
  let score = 0;
  const p90  = stats.response_p90;
  const calls = stats.calls ?? 0;
  const util  = stats.utilisation_hours;
  if (p90 != null) {
    if (p90 > 600) score += 40;
    else if (p90 > 480) score += 32;
    else if (p90 > 360) score += 22;
    else if (p90 > 300) score += 14;
  }
  if (p90 != null && p90 > 300) score += 20;
  if (avgCalls > 0 && calls > 0) {
    const r = calls / avgCalls;
    if (r > 2.0) score += 20; else if (r > 1.5) score += 13; else if (r > 1.2) score += 7;
  }
  if (util != null) {
    if (util > 100) score += 20; else if (util > 70) score += 12; else if (util > 40) score += 5;
  }
  return Math.min(100, Math.max(0, score));
}

// ── SORTABLE UNIT TABLE ───────────────────────────────────────────────────────
function UnitTable({ up, filterUnit }) {
  const [sortKey, setSortKey] = useState('risk');
  const [sortDir, setSortDir] = useState('desc');

  const avgCalls = useMemo(() => {
    const vals = Object.values(up.units || {}).map(s => s.calls ?? 0).filter(v => v > 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }, [up.units]);

  const entries = useMemo(() => {
    const sk = sortKey === 'nfpa' ? 'response_p90' : sortKey;
    let rows = Object.entries(up.units || {}).map(([u, s]) => [u, { ...s, risk: calcRiskScore(s, avgCalls) }]);
    if (filterUnit) rows = rows.filter(([u]) => u === filterUnit);
    return rows.sort((a, b) => {
      const va = a[1][sk] ?? (sortDir === 'desc' ? -Infinity : Infinity);
      const vb = b[1][sk] ?? (sortDir === 'desc' ? -Infinity : Infinity);
      return sortDir === 'desc' ? vb - va : va - vb;
    });
  }, [up.units, sortKey, sortDir, avgCalls, filterUnit]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  const cols = [
    { key: 'unit',              label: 'Unit',       sortable: false },
    { key: 'risk',              label: 'Risk Score',  sortable: true  },
    { key: 'calls',             label: 'Calls',       sortable: true  },
    { key: 'response_median',   label: 'Median RT',   sortable: true  },
    { key: 'response_p90',      label: 'P90 RT',      sortable: true  },
    { key: 'nfpa',              label: 'NFPA P90',    sortable: true  },
    { key: 'utilisation_hours', label: 'Util. hrs',   sortable: true  },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            {cols.map(col => {
              const sk = col.key === 'nfpa' ? 'response_p90' : col.key;
              const active = sortKey === sk;
              return (
                <th key={col.key}
                  className={`pb-4 text-left text-xs font-bold uppercase tracking-widest pr-4 select-none
                    ${col.sortable ? 'cursor-pointer hover:text-slate-200' : ''}
                    ${active ? 'text-blue-400' : 'text-slate-400'}`}
                  onClick={() => col.sortable && toggleSort(sk)}
                >
                  {col.label}{col.sortable && active && <span className="ml-1">{sortDir === 'desc' ? '↓' : '↑'}</span>}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {entries.map(([unit, s]) => {
            const failing  = s.response_p90 != null && s.response_p90 > 300;
            const critical = s.response_p90 != null && s.response_p90 > 480;
            const risk     = s.risk ?? 0;
            const riskColor    = risk >= 70 ? 'text-red-400'    : risk >= 40 ? 'text-amber-400'    : 'text-emerald-400';
            const riskBarColor = risk >= 70 ? 'bg-red-500'      : risk >= 40 ? 'bg-amber-500'      : 'bg-emerald-500';
            return (
              <tr key={unit} className={`border-b border-white/5 last:border-0 transition-colors hover:bg-white/3
                ${critical ? 'bg-red-500/8' : failing ? 'bg-amber-500/5' : entries.indexOf(entries.find(e => e[0] === unit)) % 2 === 0 ? 'bg-white/[0.02]' : ''}`}>
                <td className="py-4 pr-4 font-bold text-white whitespace-nowrap text-base">
                  {unit}
                  {critical && <span className="ml-2 text-xs font-bold text-red-300 bg-red-500/20 border border-red-500/40 px-2 py-0.5 rounded uppercase">Critical</span>}
                  {failing && !critical && <span className="ml-2 text-xs font-bold text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded uppercase">At Risk</span>}
                </td>
                <td className="py-4 pr-5">
                  <div className="flex items-center gap-2">
                    <span className={`text-base font-bold w-9 shrink-0 tabular-nums ${riskColor}`}>{risk}</span>
                    <div className="w-20 h-3 bg-slate-800 rounded overflow-hidden">
                      <div className={`h-full rounded transition-all ${riskBarColor}`} style={{ width: `${risk}%` }} />
                    </div>
                  </div>
                </td>
                <td className="py-4 pr-4 text-slate-200 font-medium tabular-nums text-base">{s.calls?.toLocaleString() ?? '—'}</td>
                <td className="py-4 pr-4 text-slate-200 tabular-nums text-base">{s.response_median != null ? fmtSec(s.response_median) : '—'}</td>
                <td className={`py-4 pr-4 font-bold tabular-nums text-base ${critical ? 'text-red-400' : failing ? 'text-amber-400' : 'text-slate-100'}`}>
                  {s.response_p90 != null ? fmtSec(s.response_p90) : '—'}
                </td>
                <td className="py-4 pr-4">
                  {s.response_p90 != null ? (
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${s.response_p90 <= 300 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40'}`}>
                      {s.response_p90 <= 300 ? '✓ PASS' : '✗ FAIL'}
                    </span>
                  ) : '—'}
                </td>
                <td className="py-4 text-slate-300 text-base tabular-nums font-medium">{s.utilisation_hours != null ? `${s.utilisation_hours}h` : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── MODEL EXPLANATION ─────────────────────────────────────────────────────────
function ModelExplanationCard({ explanation }) {
  if (!explanation?.model_name) return null;
  const { model_name, model_reason, is_reliable, reliability_warning, top_features, model_scores, train_days, test_days } = explanation;
  const sortedScores = Object.entries(model_scores || {}).sort((a, b) => a[1].mae - b[1].mae);
  return (
    <div className="rounded-xl border border-[#1e3050] bg-[#0d1627] p-6">
      <SectionLabel title="AI Forecast Model" sub={`Trained on ${train_days?.toLocaleString()} days · tested on ${test_days} day window`} badge="Predictive" />
      <div className="flex items-center gap-2 mb-4">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${is_reliable ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
          {is_reliable ? 'Reliable' : 'Low Reliability'}
        </span>
      </div>
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-3 mb-4">
        <p className="text-xs font-bold text-blue-300">Selected: {model_name}</p>
        <p className="text-xs text-blue-400/80 mt-1">{model_reason}</p>
      </div>
      {reliability_warning && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 mb-4">
          <p className="text-xs text-amber-300">⚠ {reliability_warning}</p>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {sortedScores.length > 0 && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">Candidate Models (by MAE)</p>
            <div className="space-y-1">
              {sortedScores.map(([name, s]) => (
                <div key={name} className={`flex items-center justify-between text-xs py-2 px-3 rounded ${name === model_name ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-slate-800/50'}`}>
                  <span className="text-slate-300 truncate">{name === model_name ? '★ ' : ''}{name}</span>
                  <div className="flex gap-3 text-slate-500 shrink-0">
                    <span>MAE <span className="font-bold text-slate-300">{s.mae?.toFixed(2)}</span></span>
                    <span>R² <span className={`font-bold ${(s.r2 ?? 0) >= 0.3 ? 'text-emerald-400' : 'text-red-400'}`}>{s.r2?.toFixed(2)}</span></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {top_features?.length > 0 && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">Top Predictive Features</p>
            <div className="space-y-2">
              {top_features.slice(0, 8).map(({ feature, importance }) => (
                <div key={feature} className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-32 truncate shrink-0">{feature}</span>
                  <div className="flex-1 h-2 bg-slate-800 rounded overflow-hidden">
                    <div className="h-full bg-violet-500 rounded" style={{ width: `${importance * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-500 w-10 text-right shrink-0">{(importance * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── ACTION BUILDER ────────────────────────────────────────────────────────────
function buildActions(report) {
  const actions = [];
  const rt   = report?.modules?.response_times   || {};
  const nfpa = rt.nfpa_1710                      || {};
  const up   = report?.modules?.unit_performance || {};
  const mn   = report?.modules?.municipality     || {};
  const sf   = report?.modules?.staffing         || {};
  const fc   = report?.modules?.forecasting      || {};
  const total = rt.total_response || {};

  if (!nfpa.compliant && nfpa.pct_within_target != null) {
    const p90 = total.p90;
    const gap = p90 != null ? p90 - 300 : null;
    const wmu = Object.entries(mn.municipalities || {}).filter(([, s]) => s.response_p90 > 300).sort((a, b) => b[1].response_p90 - a[1].response_p90)[0];
    const wu  = Object.entries(up.units || {}).filter(([, s]) => s.response_p90 > 300).sort((a, b) => b[1].response_p90 - a[1].response_p90)[0];
    actions.push({
      priority: 'CRITICAL', icon: '🚨',
      title: 'NFPA 1710 Compliance — Immediate Intervention Required',
      situation: `Agency P90 response is ${fmtSec(p90)}${gap != null ? `, exceeding the 5:00 BLS standard by ${fmtSec(gap)}` : ''}. Only ${nfpa.pct_within_target?.toFixed(1)}% of calls meet the standard (target ≥ 90%).`,
      recommended: [
        wu  ? `Prioritize deployment rebalancing for ${wu[0]} (P90: ${fmtSec(wu[1].response_p90)})` : 'Audit unit deployment strategy across all zones',
        wmu ? `Address coverage gaps in ${wmu[0]} (P90: ${fmtSec(wmu[1].response_p90)})` : 'Review geographic post positioning',
        'Evaluate peak-demand hours vs. on-duty unit availability',
      ],
      impact: 'Optimized deployment typically yields +12–20% compliance improvement within 60 days.',
      tier: null,
    });
  }

  const riskUnits = Object.entries(up.units || {}).filter(([, s]) => s.response_p90 != null && s.response_p90 > 300).sort((a, b) => b[1].response_p90 - a[1].response_p90);
  if (riskUnits.length > 0) {
    const top = riskUnits[0];
    actions.push({
      priority: 'HIGH', icon: '⚡',
      title: `Unit Performance Alert — ${riskUnits.length} Unit${riskUnits.length > 1 ? 's' : ''} Failing NFPA P90`,
      situation: `${top[0]} has P90 of ${fmtSec(top[1].response_p90)}, which is ${fmtSec(top[1].response_p90 - 300)} over target.${riskUnits.length > 1 ? ` Also failing: ${riskUnits.slice(1, 3).map(([u]) => u).join(', ')}.` : ''}`,
      recommended: [
        `Conduct zone-coverage audit for ${top[0]}`,
        'Analyze call density vs. post positioning for all failing units',
        riskUnits.length > 2 ? 'Consider adding supplemental unit during peak demand windows' : 'Review mutual aid trigger thresholds',
      ],
      impact: 'Resolving top-unit delays typically reduces agency-wide P90 by 30–90 seconds.',
      tier: null,
    });
  }

  if ((sf.overtime_pct ?? 0) > 20) {
    actions.push({
      priority: 'HIGH', icon: '💰',
      title: `Staffing Cost Risk — ${sf.overtime_pct}% Overtime Rate`,
      situation: `Overtime at ${sf.overtime_pct}% exceeds the 10–15% sustainable benchmark, elevating both budget exposure and attrition risk simultaneously.`,
      recommended: [
        'Open 2–3 FTE recruitment positions immediately',
        'Implement mandatory overtime ceiling for current quarter',
        'Cross-train per-diem roster to absorb coverage gaps',
      ],
      impact: 'Reducing to 15% overtime: estimated 25–35% reduction in OT labor cost.',
      tier: null,
    });
  }

  if (fc.attrition_risk?.risk_level === 'high' || fc.attrition_risk?.risk_level === 'medium') {
    const lvl = fc.attrition_risk.risk_level;
    actions.push({
      priority: lvl === 'high' ? 'CRITICAL' : 'MEDIUM', icon: '👥',
      title: `${lvl === 'high' ? 'High' : 'Moderate'} Attrition Risk — Retention Action Required`,
      situation: fc.attrition_risk.indicators?.join(' ') || 'Predictive model detected multiple staffing attrition risk factors.',
      recommended: [
        'Conduct retention interviews with 5+ year tenure staff this quarter',
        'Benchmark compensation against regional EMS market rates',
        'Initiate hiring pipeline 60–90 days ahead of projected vacancies',
      ],
      impact: 'Proactive retention reduces replacement cost by $45,000–$85,000 per position.',
      tier: 'Predictive',
    });
  }

  if (fc.call_volume_forecast?.trend_direction === 'increasing' && (fc.call_volume_forecast?.trend_slope ?? 0) > 0.3) {
    const slope  = fc.call_volume_forecast.trend_slope;
    const annual = Math.round(slope * 365);
    actions.push({
      priority: 'MEDIUM', icon: '📈',
      title: 'Volume Growth — Capacity Planning Window Opening',
      situation: `Call volume is increasing at +${slope?.toFixed(2)} calls/day. Projected annual growth: ~${annual} additional calls.`,
      recommended: [
        'Model 12-month staffing needs for a +15% volume scenario',
        'Present capacity investment case to board before next budget cycle',
        'Evaluate station and post placement for growing demand zones',
      ],
      impact: `Proactive staffing for +${annual} annual calls prevents NFPA compliance degradation.`,
      tier: 'Predictive',
    });
  }

  return actions;
}

// ── ACTION CARD ───────────────────────────────────────────────────────────────
function ActionCard({ action }) {
  const cfg = {
    CRITICAL: { wrap: 'border-red-500/60 bg-red-500/8 shadow-xl shadow-red-500/15',    badge: 'bg-red-500/25 text-red-200 border border-red-500/50',    label: '🚨 ACTION REQUIRED' },
    HIGH:     { wrap: 'border-amber-500/60 bg-amber-500/8 shadow-xl shadow-amber-500/15', badge: 'bg-amber-500/25 text-amber-200 border border-amber-500/50', label: '⚡ HIGH PRIORITY' },
    MEDIUM:   { wrap: 'border-blue-500/40 bg-blue-500/5 shadow-lg shadow-blue-500/10',  badge: 'bg-blue-500/25 text-blue-200 border border-blue-500/50',  label: '📋 RECOMMENDED' },
    LOW:      { wrap: 'border-white/15 bg-white/3',        badge: 'bg-white/15 text-slate-300 border border-white/20',    label: '💡 ADVISORY' },
  }[action.priority] || { wrap: 'border-white/15 bg-white/3', badge: 'bg-white/15 text-slate-300 border border-white/20', label: '💡 ADVISORY' };

  return (
    <div className={`rounded-xl border p-8 ${cfg.wrap}`}>
      <div className="flex items-start gap-4 mb-5">
        <span className="text-3xl shrink-0 mt-0.5">{action.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`text-sm font-bold uppercase tracking-widest px-3 py-1 rounded-lg ${cfg.badge}`}>{cfg.label}</span>
            {action.tier && <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/40 uppercase tracking-widest">{action.tier}</span>}
          </div>
          <h3 className="text-xl font-bold text-white leading-snug mt-1">{action.title}</h3>
        </div>
      </div>
      <p className="text-base text-slate-200 leading-relaxed mb-5">{action.situation}</p>
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Recommended Actions</p>
        <ul className="space-y-3">
          {action.recommended.map((r, i) => (
            <li key={i} className="flex items-start gap-3 text-base text-slate-200 leading-relaxed">
              <span className="text-blue-400 shrink-0 font-bold text-lg mt-0">›</span>{r}
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-black/20 rounded-xl px-5 py-4 border border-white/8">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Projected Impact</p>
        <p className="text-base text-emerald-300 leading-relaxed font-medium">{action.impact}</p>
      </div>
    </div>
  );
}

// ── FILTER SELECT ─────────────────────────────────────────────────────────────
function FilterSelect({ name, options, placeholder, value, onChange }) {
  if (!options.length) return null;
  return (
    <select
      value={value}
      onChange={e => onChange(name, e.target.value)}
      className={`text-sm px-3 py-1.5 rounded-lg border bg-[#0d1627] outline-none cursor-pointer transition-colors
        ${value ? 'border-blue-500/60 text-blue-200' : 'border-white/15 text-slate-300 hover:border-white/25'}`}
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// ── EXECUTIVE FILTER BAR ──────────────────────────────────────────────────────
function FilterBar({ report, filters, setFilters }) {
  const rt = report?.modules?.response_times   || {};
  const up = report?.modules?.unit_performance || {};
  const mn = report?.modules?.municipality     || {};
  const cv = report?.modules?.call_volume      || {};

  const munis = Object.keys(mn.municipalities || {}).sort();
  const units = Object.keys(up.units || {}).sort();
  const types = Object.keys(cv.by_incident_type || {}).sort();
  const prios = Object.keys(rt.by_priority || {}).sort();
  const days  = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].filter(d => (cv.by_day_of_week || {})[d] != null);
  const active = Object.values(filters).some(v => v !== '');

  function handleChange(name, value) {
    setFilters(f => ({ ...f, [name]: value }));
  }

  return (
    <div className="bg-[#040a14]/95 border-b border-white/10 px-6 py-3 sticky top-[49px] z-40 backdrop-blur-sm">
      <div className="max-w-screen-xl mx-auto flex items-center gap-3 flex-wrap">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400 mr-1 shrink-0">Filters</span>
        <FilterSelect name="muni" options={munis} placeholder="All Municipalities" value={filters.muni} onChange={handleChange} />
        <FilterSelect name="unit" options={units} placeholder="All Units"          value={filters.unit} onChange={handleChange} />
        <FilterSelect name="type" options={types} placeholder="All Incident Types" value={filters.type} onChange={handleChange} />
        <FilterSelect name="prio" options={prios} placeholder="All Priorities"     value={filters.prio} onChange={handleChange} />
        <FilterSelect name="day"  options={days}  placeholder="All Days"           value={filters.day}  onChange={handleChange} />
        {active && (
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center gap-1.5 flex-wrap">
              {Object.entries(filters).filter(([, v]) => v).map(([k, v]) => (
                <span key={k} className="text-xs px-3 py-1 rounded-full bg-blue-500/15 text-blue-200 border border-blue-500/30 flex items-center gap-1.5 font-medium">
                  {v}
                  <button onClick={() => setFilters(f => ({ ...f, [k]: '' }))} className="hover:text-white ml-0.5">✕</button>
                </span>
              ))}
            </div>
            <button
              onClick={() => setFilters({ muni: '', unit: '', type: '', prio: '', day: '' })}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white/5 text-slate-300 border border-white/15 hover:bg-white/10 transition-colors shrink-0"
            >
              Clear All
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── BENCHMARK PANEL ───────────────────────────────────────────────────────────
function BenchmarkRow({ label, standard, yourValue, target, isTime }) {
  if (yourValue == null) return null;
  const over   = isTime ? yourValue > target : yourValue < target;
  const gapAbs = isTime ? Math.abs(yourValue - target) : Math.abs(target - yourValue);
  const gapFmt = isTime ? fmtSec(gapAbs) : `${gapAbs.toFixed(1)}%`;
  const valFmt = isTime ? fmtSec(yourValue) : `${yourValue.toFixed(1)}%`;
  const tgtFmt = isTime ? fmtSec(target)    : `${target}%`;
  return (
    <div className="grid grid-cols-4 gap-4 py-4 border-b border-white/5 last:border-0 items-center">
      <div>
        <p className="text-sm font-bold text-slate-100">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{standard}</p>
      </div>
      <div className="text-center">
        <p className={`text-2xl font-bold tabular-nums ${over ? 'text-red-400' : 'text-emerald-400'}`}>{valFmt}</p>
        <p className="text-xs text-slate-400">Your agency</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold tabular-nums text-slate-400">{tgtFmt}</p>
        <p className="text-xs text-slate-500">Standard</p>
      </div>
      <div className="text-right">
        <p className={`text-base font-bold tabular-nums ${over ? 'text-red-400' : 'text-emerald-400'}`}>
          {over ? `+${gapFmt} over` : `−${gapFmt} under`}
        </p>
        <p className="text-xs text-slate-500">vs target</p>
      </div>
    </div>
  );
}

function BenchmarkPanel({ rt, nfpa }) {
  const total  = rt.total_response || {};
  const callPr = rt.call_processing || {};
  const turnout = rt.turnout || {};
  const travel  = rt.travel  || {};
  return (
    <div className="rounded-xl border border-[#1e3050] bg-[#0d1627] p-6">
      <SectionLabel title="Benchmark Comparison" sub="Your agency vs NFPA 1710 standards and national EMS averages" />
      <div className="grid grid-cols-4 gap-4 pb-4 border-b border-white/10 mb-1">
        {['Metric','Your Agency','Standard','Gap'].map(h => (
          <p key={h} className="text-xs font-bold uppercase tracking-widest text-slate-400">{h}</p>
        ))}
      </div>
      <BenchmarkRow label="P90 Total Response"  standard="NFPA 1710 BLS"      yourValue={total.p90}       target={300} isTime />
      <BenchmarkRow label="Median Response"      standard="National EMS avg"    yourValue={total.median}    target={270} isTime />
      <BenchmarkRow label="Call Processing Time" standard="NFPA 1710"           yourValue={callPr.median}   target={64}  isTime />
      <BenchmarkRow label="Turnout Time"         standard="NFPA 1710"           yourValue={turnout.median}  target={60}  isTime />
      <BenchmarkRow label="Travel Time"          standard="NFPA 1710"           yourValue={travel.median}   target={240} isTime />
      {nfpa?.pct_within_target != null && (
        <BenchmarkRow label="NFPA Compliance Rate" standard="NFPA 1710 ≥ 90%" yourValue={nfpa.pct_within_target} target={90} isTime={false} />
      )}
    </div>
  );
}

// ── AI ASSISTANT ──────────────────────────────────────────────────────────────
function AiAssistant({ agencyId, runId }) {
  const [question, setQuestion] = useState('');
  const [answer,   setAnswer]   = useState('');
  const [loading,  setLoading]  = useState(false);
  const [asked,    setAsked]    = useState('');

  const presets = [
    'What should leadership prioritize this month?',
    'Which unit is at highest operational risk?',
    'Which municipality is driving response time failures?',
    'Are we heading toward a staffing crisis?',
    'How can we improve NFPA compliance?',
    'What is driving our overtime rate?',
  ];

  async function ask(q) {
    const q2 = q.trim();
    if (!q2) return;
    setLoading(true); setAsked(q2); setAnswer('');
    try {
      const res = await fetch(
        `/api/proxy/agencies/${agencyId}/pipeline/runs/${runId}/report-builder/ask`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ question: q2 }) }
      );
      const data = await res.json();
      setAnswer(res.ok ? (data.answer || 'No response generated.') : `Error: ${data.detail || res.statusText}`);
    } catch { setAnswer('Network error. Please try again.'); }
    finally   { setLoading(false); }
  }

  return (
    <div className="rounded-2xl border-2 border-violet-500/40 bg-gradient-to-br from-[#0d1627] to-[#100d20] p-8 shadow-2xl shadow-violet-500/10">
      <div className="flex items-center gap-5 mb-6">
        <div className="w-16 h-16 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0 text-3xl shadow-lg shadow-violet-500/20">🤖</div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold text-white">Executive AI Assistant</h2>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-violet-500/25 text-violet-300 border border-violet-500/40 uppercase tracking-widest">Predictive</span>
          </div>
          <p className="text-base text-slate-300">Ask anything about your agency's operational data — powered by Claude AI</p>
        </div>
      </div>
      <p className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-3">Example questions</p>
      <div className="flex flex-wrap gap-2 mb-6">
        {presets.map((p, i) => (
          <button key={i} onClick={() => ask(p)}
            className="text-sm px-4 py-2 rounded-xl bg-white/5 hover:bg-violet-500/15 text-slate-200 border border-white/10 hover:border-violet-500/40 transition-all text-left font-medium">
            {p}
          </button>
        ))}
      </div>
      <div className="flex gap-3 mb-5">
        <input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && ask(question)}
          placeholder="Ask a custom question about your operational data…"
          className="flex-1 px-5 py-3.5 bg-black/30 border border-white/15 rounded-xl text-base text-white placeholder-slate-500 outline-none focus:border-violet-500/60 transition-colors"
        />
        <button onClick={() => ask(question)} disabled={loading || !question.trim()}
          className="px-7 py-3.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white rounded-xl text-base font-bold transition-colors shrink-0">
          {loading ? '…' : 'Ask AI'}
        </button>
      </div>
      {(loading || answer) && (
        <div className="bg-black/25 border border-violet-500/20 rounded-xl p-6">
          {asked && <p className="text-xs text-violet-400 font-bold mb-3 uppercase tracking-widest">Q: {asked}</p>}
          {loading
            ? <div className="flex items-center gap-3 text-base text-slate-300"><div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /> Analyzing operational data…</div>
            : <p className="text-base text-white leading-relaxed font-medium">{answer}</p>
          }
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { agencyId, runId } = useParams();
  const [loading, setLoading] = useState(true);
  const [report,  setReport]  = useState(null);
  const [error,   setError]   = useState('');
  const [filters, setFilters] = useState({ muni: '', unit: '', type: '', prio: '', day: '' });

  useEffect(() => {
    if (!agencyId || !runId) return;
    (async () => {
      try {
        const res = await fetch(
          `/api/proxy/agencies/${agencyId}/pipeline/runs/${runId}/report`,
          { credentials: 'include' }
        );
        if (res.status === 401) { router.replace('/portal/login'); return; }
        if (res.status === 404) { setError('Report not available yet. The pipeline may still be running.'); setLoading(false); return; }
        if (!res.ok)            { setError('Failed to load analytics report.'); setLoading(false); return; }
        setReport(await res.json());
      } catch {
        setError('Network error loading report.');
      } finally {
        setLoading(false);
      }
    })();
  }, [agencyId, runId, router]);

  // ── All derived state MUST be before early returns (Rules of Hooks) ────────
  const m     = report?.key_metrics || {};
  const cv    = report?.modules?.call_volume || {};
  const rt    = report?.modules?.response_times || {};
  const val   = report?.modules?.validation || {};
  const sf    = report?.modules?.staffing || {};
  const up    = report?.modules?.unit_performance || {};
  const mn    = report?.modules?.municipality || {};
  const fc    = report?.modules?.forecasting || {};
  const dq    = report?.modules?.data_quality || {};
  const qw    = report?.quality_warnings || [];
  const flags = report?.chart_flags || {};
  const me    = report?.model_explanation || {};

  const totalResp = rt.total_response  || {};
  const callProc  = rt.call_processing || {};
  const turnout   = rt.turnout         || {};
  const travel    = rt.travel          || {};
  const nfpa      = rt.nfpa_1710       || {};

  const actions    = useMemo(() => buildActions(report), [report]);
  const critCount  = actions.filter(a => a.priority === 'CRITICAL' || a.priority === 'HIGH').length;
  const nfpaValid  = flags.response_time !== false && nfpa.valid !== false;
  const p90Val     = totalResp.p90;
  const p90Status  = !nfpaValid ? 'neutral' : nfpa.compliant ? 'good' : p90Val > 480 ? 'critical' : 'warning';
  const pctStatus  = !nfpaValid ? 'neutral' : (nfpa.pct_within_target ?? 0) >= 90 ? 'good' : (nfpa.pct_within_target ?? 0) >= 70 ? 'warning' : 'critical';
  const failUnits  = Object.values(up.units || {}).filter(s => s.response_p90 != null && s.response_p90 > 300).length;
  const totalUnits = Object.keys(up.units || {}).length;

  const filteredMunis = useMemo(() => {
    const entries = Object.entries(report?.modules?.municipality?.municipalities || {});
    return filters.muni ? entries.filter(([name]) => name === filters.muni) : entries;
  }, [report, filters.muni]);

  const filteredPrios = useMemo(() => {
    const entries = Object.entries(report?.modules?.response_times?.by_priority || {});
    return filters.prio ? entries.filter(([p]) => p === filters.prio) : entries;
  }, [report, filters.prio]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#070d1a]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-400">Loading intelligence…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-[#070d1a] flex-col gap-4">
      <p className="text-sm text-red-400">{error}</p>
      <Link href={`/platform/${agencyId}`} className="text-sm text-blue-400 hover:text-blue-300">← Back to dashboard</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#070d1a] text-white">

      {/* ── COMMAND BAR ────────────────────────────────────────────────── */}
      <header className="bg-[#040a14] border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={`/platform/${agencyId}`} className="text-sm text-slate-400 hover:text-slate-200 transition-colors shrink-0">← Platform</Link>
          <span className="text-white/20">|</span>
          <span className="text-base font-bold text-white truncate">{report?.agency_name}</span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold uppercase tracking-widest shrink-0">Intelligence</span>
          {critCount > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/25 text-red-300 border border-red-500/40 font-bold animate-pulse shrink-0">
              {critCount} ACTION{critCount > 1 ? 'S' : ''} REQUIRED
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-slate-500 hidden sm:block">{report?.generated_at ? new Date(report.generated_at).toLocaleString() : ''}</span>
          <Link href={`/platform/${agencyId}/analytics/${runId}/interactive`}
            className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors">Interactive →</Link>
          <Link href={`/platform/${agencyId}/analytics/${runId}/report-builder`}
            className="text-xs px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-lg font-bold transition-colors">Build Report →</Link>
        </div>
      </header>

      {/* ── STICKY FILTER BAR ──────────────────────────────────────────── */}
      {report && <FilterBar report={report} filters={filters} setFilters={setFilters} />}

      <main className="max-w-screen-xl mx-auto px-6 py-12 space-y-12">

        {/* ── EXECUTIVE ACTION PANEL ──────────────────────────────────── */}
        {actions.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-white/8" />
              <div className="flex items-center gap-3">
                {critCount > 0 && <span className="inline-block w-3 h-3 rounded-full bg-red-500 animate-pulse" />}
                <span className="text-lg font-bold text-white">
                  Executive Recommended Actions
                </span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-white/10">
                  {actions.length} item{actions.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex-1 h-px bg-white/8" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {actions.map((a, i) => <ActionCard key={i} action={a} />)}
            </div>
          </div>
        )}

        {/* ── EXECUTIVE KPI TIER 1 ────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-3xl font-bold text-white">Executive Summary</h2>
              <p className="text-sm text-slate-400 mt-1">{m.date_range_start ?? '—'} – {m.date_range_end ?? '—'}</p>
            </div>
            {Object.values(filters).some(v => v) && (
              <span className="text-xs text-blue-300 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg font-medium">
                Filtered view active
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard label="Total Calls" value={m.total_calls?.toLocaleString()} status="neutral" large
              sub={`Busiest: ${cv.busiest_day ?? '—'}`} />
            <KpiCard label="P90 Response Time" value={m.p90_response_fmt ?? fmtSec(p90Val)}
              benchmark="5m 00s (NFPA 1710 BLS)" status={p90Status} large
              trend={nfpaValid && p90Val != null ? (p90Val > 300 ? `▲ +${fmtSec(p90Val - 300)}` : `▼ −${fmtSec(300 - p90Val)}`) : null}
              insight={nfpaValid ? (nfpa.compliant ? 'Within NFPA 1710 target' : 'Exceeds NFPA 1710 target') : 'RT data unavailable'} />
            <KpiCard label="NFPA Compliance" value={nfpaValid && nfpa.pct_within_target != null ? `${nfpa.pct_within_target?.toFixed(1)}%` : '—'}
              benchmark="≥ 90% required" status={pctStatus} large
              insight={nfpaValid ? `${nfpa.compliant ? 'Meets' : 'Fails'} NFPA 1710 BLS standard` : 'Insufficient RT data'} />
            <KpiCard label="Units at Risk" value={totalUnits > 0 ? `${failUnits} / ${totalUnits}` : '—'}
              sub="Exceeding NFPA P90 target" large
              status={failUnits === 0 ? 'good' : failUnits / Math.max(totalUnits, 1) > 0.4 ? 'critical' : 'warning'}
              insight={failUnits === 0 ? 'All units within target' : `${failUnits} unit${failUnits > 1 ? 's' : ''} need attention`} />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mt-5">
            <KpiCard label="Median Response" value={m.median_response_fmt ?? fmtSec(totalResp.median)} sub="50th percentile" />
            <KpiCard label="Mean Response"   value={m.avg_total_response_fmt ?? fmtSec(totalResp.mean)} sub="Average" />
            <KpiCard label="Data Coverage"
              value={dq?.total_rows_raw > 0 ? `${Math.round((dq.total_rows_clean / Math.max(dq.total_rows_raw, 1)) * 100)}%` : '—'}
              sub={`${dq?.total_rows_clean?.toLocaleString() ?? 0} / ${dq?.total_rows_raw?.toLocaleString() ?? 0} clean`}
              status={dq?.total_rows_raw > 0 && (dq.total_rows_clean / dq.total_rows_raw) > 0.9 ? 'good' : 'warning'} />
            <KpiCard label="Call Trend"
              value={fc.call_volume_forecast?.trend_direction ?? '—'}
              sub={fc.call_volume_forecast?.trend_slope != null ? `${fc.call_volume_forecast.trend_slope > 0 ? '+' : ''}${fc.call_volume_forecast.trend_slope} calls/day` : 'No forecast'}
              status={fc.call_volume_forecast?.trend_direction === 'increasing' ? 'warning' : 'neutral'} />
          </div>
        </div>

        {/* ── BENCHMARK COMPARISON ────────────────────────────────────── */}
        {(totalResp.p90 != null || totalResp.median != null) && (
          <BenchmarkPanel rt={rt} nfpa={nfpa} />
        )}

        {/* ── RESPONSE TIME ANALYSIS ──────────────────────────────────── */}
        {flags.response_time !== false ? (
          <div className="rounded-xl border border-[#1e3050] bg-[#0d1627] p-6">
            <SectionLabel title="Response Time Analysis" sub="Phase-by-phase breakdown · medians unless noted" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Phase Intervals</p>
                <RtRow label="Call Processing  (call → dispatch)"     value={callProc.median}  target={64} />
                <RtRow label="Turnout          (dispatch → en route)" value={turnout.median}   target={60} />
                <RtRow label="Travel           (en route → on scene)" value={travel.median}    target={240} />
                <RtRow label="Total Response   (call → on scene)"     value={totalResp.median} target={300} isKey />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Total Response Distribution</p>
                <RtRow label="Mean"      value={totalResp.mean} />
                <RtRow label="P90"       value={totalResp.p90}  target={300} isKey />
                <RtRow label="P95"       value={totalResp.p95} />
                <RtRow label="Max (raw)" value={totalResp.max} />
              </div>
            </div>
            {filteredPrios.length > 0 && (
              <div className="mt-6 pt-5 border-t border-white/10">
                <p className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">
                  By Call Priority
                  {filters.prio && <span className="ml-2 text-blue-400 normal-case font-normal text-sm">— filtered: {filters.prio}</span>}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPrios.map(([prio, stats]) => (
                    <div key={prio}
                      className={`rounded-xl px-5 py-4 cursor-pointer transition-colors ${filters.prio === prio ? 'bg-blue-500/15 border border-blue-500/30' : 'bg-slate-800/50 hover:bg-slate-800 border border-white/5'}`}
                      onClick={() => setFilters(f => ({ ...f, prio: f.prio === prio ? '' : prio }))}
                    >
                      <p className="text-sm font-bold text-slate-300 mb-3">Priority {prio}</p>
                      <div className="flex justify-between text-sm gap-2 flex-wrap">
                        <span className="text-slate-400">{stats.count?.toLocaleString()} calls</span>
                        <span className="text-slate-200">Median <span className="font-bold text-white">{fmtSec(stats.median)}</span></span>
                        <span className={stats.p90 > 300 ? 'text-red-400' : 'text-slate-200'}>P90 <span className="font-bold">{fmtSec(stats.p90)}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4">
            <p className="text-sm text-amber-300 flex items-start gap-2"><span>⚠</span><span>{rt.warning || 'Response time data unavailable — arrival timestamps not found or zero-filled.'}</span></p>
          </div>
        )}

        {/* ── CALL VOLUME ─────────────────────────────────────────────── */}
        {(Object.keys(cv.by_incident_type || {}).length > 0 || Object.keys(cv.by_month || {}).length > 0) && (
          <div className="rounded-xl border border-[#1e3050] bg-[#0d1627] p-6">
            <SectionLabel title="Call Volume Analysis" sub="Click any bar to filter the dashboard" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {Object.keys(cv.by_incident_type || {}).length > 0 && (
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">By Incident Type</p>
                  <DarkBarChart data={cv.by_incident_type} maxBars={12} accent="#3b82f6"
                    activeKey={filters.type} onSelect={v => setFilters(f => ({ ...f, type: v }))} />
                </div>
              )}
              {Object.keys(cv.by_month || {}).length > 0 && (
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Monthly Volume</p>
                  <DarkBarChart data={cv.by_month} maxBars={24} accent="#8b5cf6" />
                </div>
              )}
              {Object.keys(cv.by_day_of_week || {}).length > 0 && (
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">By Day of Week</p>
                  <DarkBarChart data={cv.by_day_of_week} maxBars={7} accent="#10b981"
                    activeKey={filters.day} onSelect={v => setFilters(f => ({ ...f, day: v }))} />
                </div>
              )}
              {flags.call_volume_by_hour !== false && Object.keys(cv.by_hour || {}).length > 0 && (
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">By Hour of Day</p>
                  <DarkBarChart data={cv.by_hour} maxBars={24} accent="#f59e0b" />
                </div>
              )}
              {Object.keys(cv.by_unit || {}).length > 0 && (
                <div className="lg:col-span-2">
                  <p className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Top Units by Call Volume</p>
                  <DarkBarChart data={cv.by_unit} maxBars={15} accent="#06b6d4"
                    activeKey={filters.unit} onSelect={v => setFilters(f => ({ ...f, unit: v }))} />
                </div>
              )}
            </div>
            {flags.call_volume_by_hour === false && (
              <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                <p className="text-xs text-amber-300">⚠ Hourly distribution unavailable — call_date field is date-only with no time component.</p>
              </div>
            )}
          </div>
        )}

        {/* ── UNIT PERFORMANCE ────────────────────────────────────────── */}
        {up.total_units > 0 && (
          <div className="rounded-xl border border-[#1e3050] bg-[#0d1627] p-6">
            <SectionLabel title="Unit Performance — Risk-Ranked"
              sub={`${up.total_units} units · ${failUnits} failing NFPA P90 · sorted by risk score · click headers to re-sort`}
              badge="Operational" />
            {filters.unit && (
              <div className="mb-4 flex items-center gap-2">
                <span className="text-xs text-blue-300 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-lg">
                  Filtered: {filters.unit}
                </span>
                <button onClick={() => setFilters(f => ({ ...f, unit: '' }))} className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors">✕ Clear</button>
              </div>
            )}
            <UnitTable up={up} filterUnit={filters.unit} />
          </div>
        )}

        {/* ── GEOGRAPHIC BREAKDOWN ────────────────────────────────────── */}
        {mn.total_municipalities > 0 && (
          <div className="rounded-xl border border-[#1e3050] bg-[#0d1627] p-6">
            <SectionLabel title="Geographic Breakdown"
              sub={`${mn.total_municipalities} areas · ${mn.flagged_municipalities?.length ?? 0} exceeding NFPA P90 · click row to filter`}
              badge="Operational" />
            {filters.muni && (
              <div className="mb-4 flex items-center gap-2">
                <span className="text-xs text-blue-300 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-lg">Filtered: {filters.muni}</span>
                <button onClick={() => setFilters(f => ({ ...f, muni: '' }))} className="text-[10px] text-slate-500 hover:text-slate-300">✕ Clear</button>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    {['Area', 'Calls', 'Median RT', 'P90 RT', 'NFPA P90', 'Top Incident'].map(h => (
                      <th key={h} className="pb-4 text-left text-xs font-bold uppercase tracking-widest text-slate-400 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredMunis.map(([name, s]) => {
                    const failing = s.response_p90 != null && s.response_p90 > 300;
                    const topType = s.top_incident_types ? Object.keys(s.top_incident_types)[0] : '—';
                    return (
                      <tr key={name}
                        className={`border-b border-white/5 last:border-0 cursor-pointer transition-colors
                          ${filters.muni === name ? 'bg-blue-500/10 ring-1 ring-inset ring-blue-500/20' : failing ? 'bg-amber-500/5 hover:bg-amber-500/8' : 'hover:bg-white/4'}`}
                        onClick={() => setFilters(f => ({ ...f, muni: f.muni === name ? '' : name }))}
                      >
                        <td className="py-4 pr-4 font-bold text-white text-base">
                          {name}{failing && <span className="ml-2 text-sm text-amber-400 font-bold">⚠</span>}
                        </td>
                        <td className="py-4 pr-4 text-slate-200 tabular-nums text-base font-medium">{s.calls}</td>
                        <td className="py-4 pr-4 text-slate-200 tabular-nums text-base">{s.response_median != null ? fmtSec(s.response_median) : '—'}</td>
                        <td className={`py-4 pr-4 font-bold tabular-nums text-base ${failing ? 'text-amber-400' : 'text-slate-100'}`}>
                          {s.response_p90 != null ? fmtSec(s.response_p90) : '—'}
                        </td>
                        <td className="py-4 pr-4">
                          {s.response_p90 != null ? (
                            <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${s.response_p90 <= 300 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40'}`}>
                              {s.response_p90 <= 300 ? '✓ PASS' : '✗ FAIL'}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-4 text-slate-300 text-sm truncate max-w-[140px]">{topType}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── DATA INTELLIGENCE ASSISTANT ─────────────────────────────── */}
        <AiAssistant agencyId={agencyId} runId={runId} />

        {/* ── FORECAST CENTER ─────────────────────────────────────────── */}
        {fc.call_volume_forecast?.forecast_months?.length > 0 && (
          <div className="rounded-xl border border-[#1e3050] bg-[#0d1627] p-6">
            <SectionLabel title="Forecast Center — 12-Month Call Volume"
              sub={`Trend: ${fc.call_volume_forecast.trend_direction} · ${fc.call_volume_forecast.trend_slope > 0 ? '+' : ''}${fc.call_volume_forecast.trend_slope} calls/day · 80% prediction interval shown`}
              badge="Predictive" />
            <DarkForecastChart
              historical={fc.call_volume_forecast.historical}
              forecastMonths={fc.call_volume_forecast.forecast_months}
              forecastValues={fc.call_volume_forecast.forecast_values}
              forecastLower={fc.call_volume_forecast.forecast_lower}
              forecastUpper={fc.call_volume_forecast.forecast_upper}
            />
            {fc.call_volume_forecast?.trend_direction === 'increasing' && (
              <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3">
                <p className="text-xs text-amber-300 font-semibold">Staffing Implication</p>
                <p className="text-xs text-amber-200/80 mt-1">
                  At +{fc.call_volume_forecast.trend_slope} calls/day, expect ~{Math.round(fc.call_volume_forecast.trend_slope * 365)} additional annual calls.
                  Begin capacity modeling for the next budget cycle.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── ATTRITION RISK ──────────────────────────────────────────── */}
        {fc.attrition_risk?.risk_level && (
          <div className={`rounded-xl border p-6 ${
            fc.attrition_risk.risk_level === 'high'   ? 'border-red-500/30 bg-red-500/5' :
            fc.attrition_risk.risk_level === 'medium' ? 'border-amber-500/30 bg-amber-500/5' :
            'border-emerald-500/30 bg-emerald-500/5'}`}>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-3xl">{fc.attrition_risk.risk_level === 'high' ? '🔴' : fc.attrition_risk.risk_level === 'medium' ? '🟡' : '🟢'}</span>
              <div>
                <p className="text-xl font-bold text-white">Staffing Attrition Risk — <span className="capitalize">{fc.attrition_risk.risk_level}</span></p>
                <p className="text-sm text-slate-300">Based on overtime burden, coverage gaps, and roster dynamics</p>
              </div>
              <span className="ml-auto text-xs px-3 py-1 bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-full font-bold uppercase tracking-widest">Predictive</span>
            </div>
            {(fc.attrition_risk.indicators || []).map((ind, i) => (
              <p key={i} className="text-base text-slate-200 mt-2 ml-14 leading-relaxed">• {ind}</p>
            ))}
            {fc.attrition_risk.indicators?.length === 0 && (
              <p className="text-base text-emerald-300 ml-14 font-medium">No significant attrition risk indicators detected.</p>
            )}
          </div>
        )}

        {/* ── AI MODEL EXPLANATION ────────────────────────────────────── */}
        {me?.model_name && <ModelExplanationCard explanation={me} />}

        {/* ── STAFFING ────────────────────────────────────────────────── */}
        {sf.unique_employees > 0 && (
          <div className="rounded-xl border border-[#1e3050] bg-[#0d1627] p-6">
            <SectionLabel title="Staffing Overview" sub={`${sf.total_records} records · ${sf.unique_employees} unique staff`} badge="Operational" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Unique Staff',  value: sf.unique_employees,              color: 'text-white' },
                { label: 'Avg Hrs/Shift', value: sf.avg_hours_per_shift ?? '—',    color: 'text-white' },
                { label: 'Overtime Rate', value: `${sf.overtime_pct ?? 0}%`,        color: sf.overtime_pct > 20 ? 'text-red-400' : 'text-white' },
                { label: 'Gap Days',      value: sf.staffing_gaps?.length ?? 0,     color: (sf.staffing_gaps?.length ?? 0) > 0 ? 'text-amber-400' : 'text-emerald-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-800/50 rounded-lg px-4 py-3 text-center">
                  <p className={`text-3xl font-bold ${color}`}>{value}</p>
                  <p className="text-sm text-slate-400 mt-1">{label}</p>
                </div>
              ))}
            </div>
            {Object.keys(sf.by_shift || {}).length > 0 && (
              <div className="mb-5">
                <p className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">By Shift</p>
                <DarkBarChart data={sf.by_shift} maxBars={6} accent="#8b5cf6" />
              </div>
            )}
            {(sf.warnings || []).map((w, i) => (
              <p key={i} className="text-sm text-amber-300 mt-2 flex items-start gap-2"><span>⚠</span> {w}</p>
            ))}
          </div>
        )}

        {/* ── DATA QUALITY ────────────────────────────────────────────── */}
        {(dq?.files_loaded > 0 || qw?.length > 0) && (
          <div className={`rounded-xl border p-6 ${qw?.length > 0 ? 'border-amber-500/20 bg-amber-500/5' : 'border-emerald-500/20 bg-emerald-500/5'}`}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-lg">{qw?.length > 0 ? '⚠' : '✓'}</span>
              <p className="text-sm font-bold text-white">Data Quality</p>
              <span className="text-sm text-slate-400 ml-auto">
                {dq?.files_loaded ?? 0} file{(dq?.files_loaded ?? 0) !== 1 ? 's' : ''} loaded
                {(dq?.files_skipped ?? 0) > 0 && ` · ${dq.files_skipped} skipped`}
                {' '}· {dq?.total_rows_clean?.toLocaleString() ?? 0} clean rows
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Raw Rows',       val: dq?.total_rows_raw?.toLocaleString(), color: 'text-white' },
                { label: 'No Arrival',     val: Object.values(dq?.coerced_counts||{}).reduce((a,b)=>a+b,0).toLocaleString(), color: 'text-amber-300' },
                { label: 'Out-of-bounds',  val: Object.values(dq?.bounds_clipped||{}).reduce((a,b)=>a+b,0).toLocaleString(), color: 'text-amber-300' },
                { label: 'Fields Missing', val: dq?.missing_critical?.length > 0 ? dq.missing_critical.length : '0', color: dq?.missing_critical?.length > 0 ? 'text-red-400' : 'text-emerald-400' },
              ].map(({ label, val, color }) => (
                <div key={label} className="bg-black/20 rounded-lg px-3 py-2 text-center">
                  <p className={`text-2xl font-bold ${color}`}>{val ?? '—'}</p>
                  <p className="text-sm text-slate-400 mt-1">{label}</p>
                </div>
              ))}
            </div>
            {qw?.length > 0 && (
              <div className="space-y-2">
                {qw.map((w, i) => <p key={i} className="text-sm text-amber-200 flex items-start gap-2"><span className="shrink-0 text-amber-400">›</span>{w}</p>)}
              </div>
            )}
          </div>
        )}

        {/* ── VALIDATION SUMMARY ──────────────────────────────────────── */}
        {val.files_validated > 0 && (
          <div className="rounded-xl border border-[#1e3050] bg-[#0d1627] p-6">
            <SectionLabel title="Data Validation" sub={`${val.files_validated} file${val.files_validated > 1 ? 's' : ''} checked`} />
            <div className="flex gap-8 mb-5">
              <div className="text-center"><p className="text-4xl font-bold text-emerald-400">{val.files_passed}</p><p className="text-sm text-slate-400 mt-1">Passed</p></div>
              <div className="text-center"><p className="text-4xl font-bold text-red-400">{val.files_failed}</p><p className="text-sm text-slate-400 mt-1">Failed</p></div>
            </div>
            {(val.results || []).filter(r => r.warnings?.length > 0).length === 0 && (
              <p className="text-base text-emerald-300 font-medium">✓ All validation checks passed</p>
            )}
            {(val.results || []).filter(r => r.warnings?.length > 0).map(r => (
              <div key={r.file_id} className="mb-3">
                <p className="text-sm font-bold text-slate-200 mb-1">{r.original_filename}</p>
                {r.warnings.map((w, i) => <p key={i} className="text-sm text-amber-300 ml-3">⚠ {w}</p>)}
              </div>
            ))}
          </div>
        )}

        {/* ── FOOTER ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-6 pb-12 border-t border-white/10">
          <Link href={`/platform/${agencyId}`} className="text-sm text-slate-400 hover:text-slate-200 transition-colors font-medium">← Back to platform</Link>
          <div className="flex items-center gap-4">
            <Link href={`/platform/${agencyId}/analytics/${runId}/report-builder`}
              className="text-sm px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg border border-blue-500/30 font-bold transition-colors">
              Export Board Report →
            </Link>
            <p className="text-sm text-slate-500">{report?.agency_name} · Intelligence Platform</p>
          </div>
        </div>

      </main>
    </div>
  );
}
