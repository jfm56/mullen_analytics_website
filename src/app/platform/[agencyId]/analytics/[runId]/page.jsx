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

function riskBg(level) {
  if (level === 'critical') return 'bg-red-500/10 border-red-500/30';
  if (level === 'high')     return 'bg-red-500/10 border-red-500/30';
  if (level === 'warning')  return 'bg-amber-500/10 border-amber-500/30';
  return 'bg-emerald-500/10 border-emerald-500/30';
}
function riskText(level) {
  if (level === 'critical' || level === 'high') return 'text-red-400';
  if (level === 'warning') return 'text-amber-400';
  return 'text-emerald-400';
}

// ── ALERT BUILDER ────────────────────────────────────────────────────────────
function buildAlerts(report) {
  const alerts = [];
  const rt    = report?.modules?.response_times || {};
  const nfpa  = rt.nfpa_1710 || {};
  const up    = report?.modules?.unit_performance || {};
  const mn    = report?.modules?.municipality || {};
  const fc    = report?.modules?.forecasting || {};
  const sf    = report?.modules?.staffing || {};
  const flags = report?.chart_flags || {};

  if (flags.response_time !== false && nfpa.valid !== false && !nfpa.compliant && nfpa.pct_within_target != null) {
    const p90 = rt.total_response?.p90;
    alerts.push({ level: 'critical', icon: '🚨',
      title: 'NFPA 1710 Non-Compliant',
      message: `P90 response is ${fmtSec(p90)}, exceeding the 5m 00s BLS target. Only ${nfpa.pct_within_target?.toFixed(1)}% of calls met the standard.`,
      action: 'Investigate deployment gaps and unit coverage zones.',
    });
  }

  const failingUnits = Object.entries(up.units || {})
    .filter(([, s]) => s.response_p90 != null && s.response_p90 > 300)
    .sort((a, b) => b[1].response_p90 - a[1].response_p90);
  if (failingUnits.length > 0) {
    const top = failingUnits[0];
    alerts.push({ level: 'high', icon: '⚠',
      title: `${failingUnits.length} Unit${failingUnits.length > 1 ? 's' : ''} Exceed NFPA P90 Target`,
      message: `${top[0]} has highest P90 at ${fmtSec(top[1].response_p90)}.${failingUnits.length > 1 ? ` Also: ${failingUnits.slice(1, 3).map(([u]) => u).join(', ')}.` : ''}`,
      action: 'Review deployment, zone assignment, or unit availability.',
    });
  }

  const failingMuni = Object.entries(mn.municipalities || {})
    .filter(([, s]) => s.response_p90 != null && s.response_p90 > 300)
    .sort((a, b) => b[1].response_p90 - a[1].response_p90);
  if (failingMuni.length > 0) {
    const top = failingMuni[0];
    alerts.push({ level: 'high', icon: '📍',
      title: `Response Delays in ${failingMuni.length} Area${failingMuni.length > 1 ? 's' : ''}`,
      message: `${top[0]} leads with P90 of ${fmtSec(top[1].response_p90)}.${failingMuni.length > 1 ? ` Plus ${failingMuni.length - 1} additional area${failingMuni.length > 2 ? 's' : ''}.` : ''}`,
      action: 'Consider repositioning units or mutual aid agreements.',
    });
  }

  if ((sf.overtime_pct ?? 0) > 20) {
    alerts.push({ level: 'warning', icon: '⏱',
      title: `Overtime Rate at ${sf.overtime_pct}%`,
      message: 'Sustained overtime above 20% increases attrition risk and operational cost.',
      action: 'Review shift scheduling and hiring pipeline.',
    });
  }

  if (fc.attrition_risk?.risk_level === 'high' || fc.attrition_risk?.risk_level === 'medium') {
    alerts.push({
      level: fc.attrition_risk.risk_level === 'high' ? 'critical' : 'warning', icon: '👥',
      title: `${fc.attrition_risk.risk_level === 'high' ? 'High' : 'Moderate'} Staffing Attrition Risk`,
      message: fc.attrition_risk.indicators?.join(' · ') || 'Multiple attrition risk factors detected.',
      action: 'Initiate hiring process. Review retention incentives.',
    });
  }

  if (fc.call_volume_forecast?.trend_direction === 'increasing' && (fc.call_volume_forecast?.trend_slope ?? 0) > 0.5) {
    alerts.push({ level: 'warning', icon: '📈',
      title: 'Call Volume Trending Up',
      message: `+${fc.call_volume_forecast.trend_slope?.toFixed(2)} calls/day increase trend detected.`,
      action: 'Project additional staffing needs for next 6 months.',
    });
  }

  return alerts;
}

// ── ALERT CARD ───────────────────────────────────────────────────────────────
function AlertCard({ alert }) {
  return (
    <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${riskBg(alert.level)}`}>
      <span className="text-lg shrink-0 mt-0.5">{alert.icon}</span>
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-[10px] font-bold uppercase tracking-widest ${riskText(alert.level)}`}>{alert.level}</span>
          <span className="text-sm font-semibold text-white">{alert.title}</span>
        </div>
        <p className="text-xs text-slate-300">{alert.message}</p>
        {alert.action && <p className="text-xs text-slate-500 mt-0.5">→ {alert.action}</p>}
      </div>
    </div>
  );
}

// ── KPI CARD ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, benchmark, status = 'neutral', trend, insight, large }) {
  const borders = { critical: 'border-red-500/50 bg-red-500/5', warning: 'border-amber-500/50 bg-amber-500/5', good: 'border-emerald-500/50 bg-emerald-500/5', neutral: 'border-[#1e3050] bg-[#0d1627]' };
  const vals    = { critical: 'text-red-400', warning: 'text-amber-400', good: 'text-emerald-400', neutral: 'text-white' };
  const badges  = { critical: { text: 'CRITICAL', bg: 'bg-red-500/20 text-red-400' }, warning: { text: 'CAUTION', bg: 'bg-amber-500/20 text-amber-400' }, good: { text: 'ON TARGET', bg: 'bg-emerald-500/20 text-emerald-400' }, neutral: null };
  const badge = badges[status];
  return (
    <div className={`rounded-xl border p-5 flex flex-col gap-2 ${borders[status]}`}>
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
        {badge && <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${badge.bg}`}>{badge.text}</span>}
      </div>
      <div className="flex items-end gap-2">
        <p className={`font-bold leading-none ${large ? 'text-4xl' : 'text-3xl'} ${vals[status]}`}>{value ?? '—'}</p>
        {trend && <span className={`text-sm font-bold pb-0.5 ${trend.startsWith('▲') ? 'text-red-400' : 'text-emerald-400'}`}>{trend}</span>}
      </div>
      {benchmark && <p className="text-[11px] text-slate-500">Target: {benchmark}</p>}
      {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
      {insight && <p className="text-xs text-slate-300 border-t border-white/10 pt-2 mt-1">{insight}</p>}
    </div>
  );
}

// ── DARK BAR CHART ────────────────────────────────────────────────────────────
function DarkBarChart({ data, maxBars = 12, accent = '#3b82f6' }) {
  if (!data || Object.keys(data).length === 0) {
    return <p className="text-xs text-slate-500 py-4 text-center">No data available</p>;
  }
  const entries = Object.entries(data).map(([k, v]) => [k, Number(v)]).sort((a, b) => b[1] - a[1]).slice(0, maxBars);
  const max = Math.max(...entries.map(([, v]) => v), 1);
  return (
    <div className="space-y-2">
      {entries.map(([label, val]) => (
        <div key={label} className="flex items-center gap-3">
          <span className="text-xs text-slate-400 w-36 truncate shrink-0">{label}</span>
          <div className="flex-1 h-5 bg-slate-800/80 rounded overflow-hidden relative">
            <div className="h-full rounded transition-all" style={{ width: `${(val / max) * 100}%`, background: accent }} />
            <span className="absolute right-2 top-0.5 text-[10px] text-slate-400">{((val / max) * 100).toFixed(0)}%</span>
          </div>
          <span className="text-xs text-slate-300 w-14 text-right shrink-0 font-medium">{val.toLocaleString()}</span>
        </div>
      ))}
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
    <div className="space-y-1.5">
      {histEntries.map(([month, val]) => (
        <div key={month} className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 w-16 shrink-0 text-right">{month.slice(2)}</span>
          <div className="flex-1 h-3 bg-slate-800 rounded overflow-hidden">
            <div className="h-full bg-blue-500 rounded" style={{ width: `${(val / max) * 100}%` }} />
          </div>
          <span className="text-[10px] text-slate-400 w-8 text-right shrink-0">{val}</span>
        </div>
      ))}
      <div className="flex items-center gap-2 py-0.5">
        <span className="w-16 shrink-0" />
        <div className="flex-1 border-t border-dashed border-blue-500/40" />
        <span className="text-[10px] text-blue-400 shrink-0">forecast →</span>
      </div>
      {forecastMonths.map((month, i) => {
        const val = forecastValues[i] ?? 0;
        const lower = forecastLower[i] ?? 0;
        const upper = forecastUpper[i] ?? val;
        const lPct = (lower / max) * 100;
        const wPct = ((upper - lower) / max) * 100;
        const pPct = (val / max) * 100;
        return (
          <div key={month} className="flex items-center gap-2">
            <span className="text-[10px] text-blue-400 w-16 shrink-0 text-right">{month.slice(2)}</span>
            <div className="flex-1 h-3 bg-slate-800 rounded overflow-hidden relative">
              <div className="absolute h-full bg-blue-500/20 rounded" style={{ left: `${lPct}%`, width: `${Math.max(wPct, 1)}%` }} />
              <div className="absolute h-full bg-blue-400/60 rounded" style={{ width: `${pPct}%` }} />
            </div>
            <span className="text-[10px] text-blue-400 w-8 text-right shrink-0">{Math.round(val)}</span>
          </div>
        );
      })}
      <div className="flex gap-4 mt-2 text-[10px] text-slate-500">
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 bg-blue-500 rounded-sm" /> Historical</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 bg-blue-400/60 rounded-sm" /> Forecast</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 bg-blue-500/20 rounded-sm" /> 80% interval</span>
      </div>
    </div>
  );
}

// ── RESPONSE TIME ROW ─────────────────────────────────────────────────────────
function RtRow({ label, value, target, isKey }) {
  if (!value && value !== 0) return null;
  const over = target != null && value > target;
  return (
    <div className={`flex items-center justify-between py-2.5 border-b border-white/5 last:border-0 ${isKey ? 'bg-white/5 -mx-3 px-3 rounded' : ''}`}>
      <span className="text-sm text-slate-400">{label}</span>
      <div className="flex items-center gap-3">
        {target != null && <span className="text-[10px] text-slate-600">target {fmtSec(target)}</span>}
        <span className={`font-bold text-sm ${over ? 'text-red-400' : isKey ? 'text-white' : 'text-slate-200'}`}>{fmtSec(value)}</span>
        {over && <span className="text-[10px] text-red-400/80">▲ +{fmtSec(value - target)}</span>}
      </div>
    </div>
  );
}

// ── SECTION LABEL ─────────────────────────────────────────────────────────────
function SectionLabel({ title, sub, badge }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="flex-1">
        <h2 className="text-[11px] font-bold text-white uppercase tracking-widest">{title}</h2>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {badge && (
        <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest bg-violet-500/20 text-violet-400 border border-violet-500/30">
          {badge}
        </span>
      )}
    </div>
  );
}

// ── SORTABLE UNIT TABLE ───────────────────────────────────────────────────────
function UnitTable({ up }) {
  const [sortKey, setSortKey] = useState('calls');
  const [sortDir, setSortDir] = useState('desc');
  const entries = useMemo(() => {
    const sk = sortKey === 'nfpa' ? 'response_p90' : sortKey;
    return Object.entries(up.units || {}).sort((a, b) => {
      const va = a[1][sk] ?? (sortDir === 'desc' ? -Infinity : Infinity);
      const vb = b[1][sk] ?? (sortDir === 'desc' ? -Infinity : Infinity);
      return sortDir === 'desc' ? vb - va : va - vb;
    });
  }, [up.units, sortKey, sortDir]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  const cols = [
    { key: 'unit', label: 'Unit', sortable: false },
    { key: 'calls', label: 'Calls', sortable: true },
    { key: 'response_median', label: 'Median RT', sortable: true },
    { key: 'response_p90', label: 'P90 RT', sortable: true },
    { key: 'nfpa', label: 'NFPA P90', sortable: true },
    { key: 'utilisation_hours', label: 'Util. hrs', sortable: true },
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
                  className={`pb-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-500 pr-4 ${col.sortable ? 'cursor-pointer hover:text-slate-300 select-none' : ''}`}
                  onClick={() => col.sortable && toggleSort(sk)}
                >
                  {col.label}
                  {col.sortable && active && <span className="ml-1 text-blue-400">{sortDir === 'desc' ? '↓' : '↑'}</span>}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {entries.map(([unit, s]) => {
            const failing  = s.response_p90 != null && s.response_p90 > 300;
            const critical = s.response_p90 != null && s.response_p90 > 480;
            return (
              <tr key={unit} className={`border-b border-white/5 last:border-0 ${critical ? 'bg-red-500/5' : failing ? 'bg-amber-500/5' : ''}`}>
                <td className="py-3 pr-4 font-bold text-white">
                  {unit}
                  {critical && <span className="ml-2 text-[9px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded uppercase">Critical</span>}
                  {failing && !critical && <span className="ml-2 text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase">At Risk</span>}
                </td>
                <td className="py-3 pr-4 text-slate-300 font-medium">{s.calls?.toLocaleString() ?? '—'}</td>
                <td className="py-3 pr-4 text-slate-300">{s.response_median != null ? fmtSec(s.response_median) : '—'}</td>
                <td className={`py-3 pr-4 font-bold ${critical ? 'text-red-400' : failing ? 'text-amber-400' : 'text-slate-200'}`}>
                  {s.response_p90 != null ? fmtSec(s.response_p90) : '—'}
                </td>
                <td className="py-3 pr-4">
                  {s.response_p90 != null ? (
                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${s.response_p90 <= 300 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}>
                      {s.response_p90 <= 300 ? '✓ PASS' : '✗ FAIL'}
                    </span>
                  ) : '—'}
                </td>
                <td className="py-3 text-slate-500 text-xs">{s.utilisation_hours != null ? `${s.utilisation_hours}h` : '—'}</td>
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

export default function AnalyticsPage() {
  const router = useRouter();
  const { agencyId, runId } = useParams();
  const [loading, setLoading] = useState(true);
  const [report,  setReport]  = useState(null);
  const [error,   setError]   = useState('');
  const [alertsOpen, setAlertsOpen] = useState(true);

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

  const alerts     = buildAlerts(report);
  const critCount  = alerts.filter(a => a.level === 'critical' || a.level === 'high').length;

  const nfpaValid  = flags.response_time !== false && nfpa.valid !== false;
  const p90Val     = totalResp.p90;
  const p90Status  = !nfpaValid ? 'neutral' : nfpa.compliant ? 'good' : p90Val > 480 ? 'critical' : 'warning';
  const pctStatus  = !nfpaValid ? 'neutral' : (nfpa.pct_within_target ?? 0) >= 90 ? 'good' : (nfpa.pct_within_target ?? 0) >= 70 ? 'warning' : 'critical';
  const failUnits  = Object.values(up.units || {}).filter(s => s.response_p90 != null && s.response_p90 > 300).length;
  const totalUnits = Object.keys(up.units || {}).length;

  return (
    <div className="min-h-screen bg-[#070d1a] text-white">

      {/* ── COMMAND BAR ────────────────────────────────────────────────── */}
      <header className="bg-[#040a14] border-b border-white/10 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={`/platform/${agencyId}`} className="text-xs text-slate-500 hover:text-slate-300 transition-colors shrink-0">← Platform</Link>
          <span className="text-white/20">|</span>
          <span className="text-sm font-bold text-white truncate">{report?.agency_name}</span>
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold uppercase tracking-widest shrink-0">Intelligence</span>
          {critCount > 0 && (
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-bold animate-pulse shrink-0">
              {critCount} ALERT{critCount > 1 ? 'S' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-slate-700 hidden sm:block">
            {report?.generated_at ? new Date(report.generated_at).toLocaleString() : ''}
          </span>
          <Link href={`/platform/${agencyId}/analytics/${runId}/interactive`}
            className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors">
            Interactive →
          </Link>
          <Link href={`/platform/${agencyId}/analytics/${runId}/report-builder`}
            className="text-xs px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-lg font-bold transition-colors">
            Build Report →
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* ── OPERATIONAL ALERTS ──────────────────────────────────────── */}
        {alerts.length > 0 && (
          <div>
            <button onClick={() => setAlertsOpen(o => !o)} className="flex items-center gap-3 mb-3 w-full group">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-slate-400 flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${critCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`} />
                Operational Alerts ({alerts.length})
                <span className="text-slate-700">{alertsOpen ? '▲' : '▼'}</span>
              </span>
              <div className="flex-1 h-px bg-white/10" />
            </button>
            {alertsOpen && (
              <div className="grid grid-cols-1 gap-3">
                {alerts.map((a, i) => <AlertCard key={i} alert={a} />)}
              </div>
            )}
          </div>
        )}

        {/* ── EXECUTIVE KPI TIER 1 ────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Executive Summary</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>
          <p className="text-[11px] text-slate-600 text-right mb-4">{m.date_range_start ?? '—'} – {m.date_range_end ?? '—'}</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <KpiCard label="Median Response" value={m.median_response_fmt ?? fmtSec(totalResp.median)} sub="50th percentile" />
            <KpiCard label="Mean Response" value={m.avg_total_response_fmt ?? fmtSec(totalResp.mean)} sub="Average" />
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

        {/* ── RESPONSE TIME ANALYSIS ──────────────────────────────────── */}
        {flags.response_time !== false ? (
          <div className="rounded-xl border border-[#1e3050] bg-[#0d1627] p-6">
            <SectionLabel title="Response Time Analysis" sub="Phase-by-phase breakdown · medians unless noted" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">Phase Intervals</p>
                <RtRow label="Call Processing  (call → dispatch)"    value={callProc.median}  target={64} />
                <RtRow label="Turnout          (dispatch → en route)" value={turnout.median}   target={60} />
                <RtRow label="Travel           (en route → on scene)" value={travel.median}    target={240} />
                <RtRow label="Total Response   (call → on scene)"     value={totalResp.median} target={300} isKey />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">Total Response Distribution</p>
                <RtRow label="Mean"      value={totalResp.mean} />
                <RtRow label="P90"       value={totalResp.p90}  target={300} isKey />
                <RtRow label="P95"       value={totalResp.p95} />
                <RtRow label="Max (raw)" value={totalResp.max} />
              </div>
            </div>
            {Object.keys(rt.by_priority || {}).length > 0 && (
              <div className="mt-6 pt-5 border-t border-white/10">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">By Call Priority</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(rt.by_priority).map(([prio, stats]) => (
                    <div key={prio} className="bg-slate-800/50 rounded-lg px-4 py-3">
                      <p className="text-xs font-bold text-slate-400 mb-2">Priority {prio}</p>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">{stats.count?.toLocaleString()} calls</span>
                        <span className="text-slate-300">Median <span className="font-bold text-white">{fmtSec(stats.median)}</span></span>
                        <span className={stats.p90 > 300 ? 'text-red-400' : 'text-slate-300'}>P90 <span className="font-bold">{fmtSec(stats.p90)}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4">
            <p className="text-sm text-amber-300 flex items-start gap-2">
              <span>⚠</span>
              <span>{rt.warning || 'Response time data unavailable — arrival timestamps not found or zero-filled.'}</span>
            </p>
          </div>
        )}

        {/* ── CALL VOLUME ─────────────────────────────────────────────── */}
        {(Object.keys(cv.by_incident_type || {}).length > 0 || Object.keys(cv.by_month || {}).length > 0) && (
          <div className="rounded-xl border border-[#1e3050] bg-[#0d1627] p-6">
            <SectionLabel title="Call Volume Analysis" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {Object.keys(cv.by_incident_type || {}).length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">By Incident Type</p>
                  <DarkBarChart data={cv.by_incident_type} maxBars={12} accent="#3b82f6" />
                </div>
              )}
              {Object.keys(cv.by_month || {}).length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">Monthly Volume</p>
                  <DarkBarChart data={cv.by_month} maxBars={24} accent="#8b5cf6" />
                </div>
              )}
              {Object.keys(cv.by_day_of_week || {}).length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">By Day of Week</p>
                  <DarkBarChart data={cv.by_day_of_week} maxBars={7} accent="#10b981" />
                </div>
              )}
              {flags.call_volume_by_hour !== false && Object.keys(cv.by_hour || {}).length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">By Hour of Day</p>
                  <DarkBarChart data={cv.by_hour} maxBars={24} accent="#f59e0b" />
                </div>
              )}
              {Object.keys(cv.by_unit || {}).length > 0 && (
                <div className="lg:col-span-2">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">Top Units by Call Volume</p>
                  <DarkBarChart data={cv.by_unit} maxBars={15} accent="#06b6d4" />
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
            <SectionLabel title="Unit Performance"
              sub={`${up.total_units} units · ${failUnits} failing NFPA P90 · click column headers to sort`}
              badge="Operational" />
            <UnitTable up={up} />
          </div>
        )}

        {/* ── GEOGRAPHIC BREAKDOWN ────────────────────────────────────── */}
        {mn.total_municipalities > 0 && (
          <div className="rounded-xl border border-[#1e3050] bg-[#0d1627] p-6">
            <SectionLabel title="Geographic Breakdown"
              sub={`${mn.total_municipalities} areas · ${mn.flagged_municipalities?.length ?? 0} exceeding NFPA P90`}
              badge="Operational" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    {['Area', 'Calls', 'Median RT', 'P90 RT', 'NFPA P90', 'Top Incident'].map(h => (
                      <th key={h} className="pb-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-500 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(mn.municipalities || {}).map(([name, s]) => {
                    const failing = s.response_p90 != null && s.response_p90 > 300;
                    const topType = s.top_incident_types ? Object.keys(s.top_incident_types)[0] : '—';
                    return (
                      <tr key={name} className={`border-b border-white/5 last:border-0 ${failing ? 'bg-amber-500/5' : ''}`}>
                        <td className="py-3 pr-4 font-bold text-white">
                          {name}{failing && <span className="ml-2 text-[10px] text-amber-400">⚠</span>}
                        </td>
                        <td className="py-3 pr-4 text-slate-300">{s.calls}</td>
                        <td className="py-3 pr-4 text-slate-300">{s.response_median != null ? fmtSec(s.response_median) : '—'}</td>
                        <td className={`py-3 pr-4 font-bold ${failing ? 'text-amber-400' : 'text-slate-200'}`}>
                          {s.response_p90 != null ? fmtSec(s.response_p90) : '—'}
                        </td>
                        <td className="py-3 pr-4">
                          {s.response_p90 != null ? (
                            <span className={`text-[10px] font-bold px-2 py-1 rounded ${s.response_p90 <= 300 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}>
                              {s.response_p90 <= 300 ? '✓ PASS' : '✗ FAIL'}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-3 text-slate-500 text-xs truncate max-w-[120px]">{topType}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── AI MODEL ────────────────────────────────────────────────── */}
        {me?.model_name && <ModelExplanationCard explanation={me} />}

        {/* ── FORECAST ────────────────────────────────────────────────── */}
        {fc.call_volume_forecast?.forecast_months?.length > 0 && (
          <div className="rounded-xl border border-[#1e3050] bg-[#0d1627] p-6">
            <SectionLabel title="12-Month Call Volume Forecast"
              sub={`Trend: ${fc.call_volume_forecast.trend_direction} · ${fc.call_volume_forecast.trend_slope > 0 ? '+' : ''}${fc.call_volume_forecast.trend_slope} calls/day`}
              badge="Predictive" />
            <DarkForecastChart
              historical={fc.call_volume_forecast.historical}
              forecastMonths={fc.call_volume_forecast.forecast_months}
              forecastValues={fc.call_volume_forecast.forecast_values}
              forecastLower={fc.call_volume_forecast.forecast_lower}
              forecastUpper={fc.call_volume_forecast.forecast_upper}
            />
          </div>
        )}

        {/* ── ATTRITION RISK ──────────────────────────────────────────── */}
        {fc.attrition_risk?.risk_level && (
          <div className={`rounded-xl border p-6 ${
            fc.attrition_risk.risk_level === 'high'   ? 'border-red-500/30 bg-red-500/5' :
            fc.attrition_risk.risk_level === 'medium' ? 'border-amber-500/30 bg-amber-500/5' :
            'border-emerald-500/30 bg-emerald-500/5'
          }`}>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-3xl">{fc.attrition_risk.risk_level === 'high' ? '🔴' : fc.attrition_risk.risk_level === 'medium' ? '🟡' : '🟢'}</span>
              <div>
                <p className="text-base font-bold text-white">Staffing Attrition Risk — <span className="capitalize">{fc.attrition_risk.risk_level}</span></p>
                <p className="text-xs text-slate-400">Based on overtime burden, coverage gaps, and roster dynamics</p>
              </div>
              <span className="ml-auto text-[9px] px-2 py-0.5 bg-violet-500/20 text-violet-400 border border-violet-500/30 rounded-full font-bold uppercase tracking-widest">Predictive</span>
            </div>
            {(fc.attrition_risk.indicators || []).map((ind, i) => (
              <p key={i} className="text-xs text-slate-300 mt-1.5 ml-14">• {ind}</p>
            ))}
            {fc.attrition_risk.indicators?.length === 0 && (
              <p className="text-xs text-emerald-400 ml-14">No significant attrition risk indicators detected.</p>
            )}
          </div>
        )}

        {/* ── STAFFING ────────────────────────────────────────────────── */}
        {sf.unique_employees > 0 && (
          <div className="rounded-xl border border-[#1e3050] bg-[#0d1627] p-6">
            <SectionLabel title="Staffing Overview" sub={`${sf.total_records} records · ${sf.unique_employees} unique staff`} badge="Operational" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Unique Staff',   value: sf.unique_employees,       color: 'text-white' },
                { label: 'Avg Hrs/Shift',  value: sf.avg_hours_per_shift ?? '—', color: 'text-white' },
                { label: 'Overtime Rate',  value: `${sf.overtime_pct ?? 0}%`,  color: sf.overtime_pct > 20 ? 'text-red-400' : 'text-white' },
                { label: 'Gap Days',       value: sf.staffing_gaps?.length ?? 0, color: (sf.staffing_gaps?.length ?? 0) > 0 ? 'text-amber-400' : 'text-emerald-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-800/50 rounded-lg px-4 py-3 text-center">
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            {Object.keys(sf.by_shift || {}).length > 0 && (
              <div className="mb-5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">By Shift</p>
                <DarkBarChart data={sf.by_shift} maxBars={6} accent="#8b5cf6" />
              </div>
            )}
            {(sf.warnings || []).map((w, i) => (
              <p key={i} className="text-xs text-amber-300 mt-2 flex items-start gap-1"><span>⚠</span> {w}</p>
            ))}
          </div>
        )}

        {/* ── DATA QUALITY ────────────────────────────────────────────── */}
        {(dq?.files_loaded > 0 || qw?.length > 0) && (
          <div className={`rounded-xl border p-6 ${qw?.length > 0 ? 'border-amber-500/20 bg-amber-500/5' : 'border-emerald-500/20 bg-emerald-500/5'}`}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-lg">{qw?.length > 0 ? '⚠' : '✓'}</span>
              <p className="text-sm font-bold text-white">Data Quality</p>
              <span className="text-[11px] text-slate-500 ml-auto">
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
                  <p className={`text-lg font-bold ${color}`}>{val ?? '—'}</p>
                  <p className="text-[10px] text-slate-500">{label}</p>
                </div>
              ))}
            </div>
            {qw?.length > 0 && (
              <div className="space-y-1">
                {qw.map((w, i) => (
                  <p key={i} className="text-xs text-amber-300 flex items-start gap-1.5"><span className="shrink-0">›</span>{w}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── VALIDATION SUMMARY ──────────────────────────────────────── */}
        {val.files_validated > 0 && (
          <div className="rounded-xl border border-[#1e3050] bg-[#0d1627] p-6">
            <SectionLabel title="Data Validation" sub={`${val.files_validated} file${val.files_validated > 1 ? 's' : ''} checked`} />
            <div className="flex gap-6 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400">{val.files_passed}</p>
                <p className="text-[11px] text-slate-500">Passed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">{val.files_failed}</p>
                <p className="text-[11px] text-slate-500">Failed</p>
              </div>
            </div>
            {(val.results || []).filter(r => r.warnings?.length > 0).length === 0 && (
              <p className="text-xs text-emerald-400">✓ All validation checks passed</p>
            )}
            {(val.results || []).filter(r => r.warnings?.length > 0).map(r => (
              <div key={r.file_id} className="mb-2">
                <p className="text-xs font-bold text-slate-300">{r.original_filename}</p>
                {r.warnings.map((w, i) => <p key={i} className="text-xs text-amber-300 ml-2">⚠ {w}</p>)}
              </div>
            ))}
          </div>
        )}

        {/* ── FOOTER ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-4 pb-8 border-t border-white/10">
          <Link href={`/platform/${agencyId}`} className="text-sm text-slate-500 hover:text-slate-300 transition-colors">← Back to platform</Link>
          <p className="text-[11px] text-slate-700">{report?.agency_name} · Intelligence Report</p>
        </div>

      </main>
    </div>
  );
}
