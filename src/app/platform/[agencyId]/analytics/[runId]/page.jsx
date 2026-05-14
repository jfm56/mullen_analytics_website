'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

function MetricCard({ label, value, sub, highlight }) {
  return (
    <div className={`rounded-xl border p-5 ${highlight ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? 'text-blue-700' : 'text-gray-900'}`}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionHeader({ title, sub }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function BarChart({ data, maxBars = 12 }) {
  if (!data || Object.keys(data).length === 0) {
    return <p className="text-xs text-gray-400 py-4 text-center">No data</p>;
  }
  const entries = Object.entries(data)
    .map(([k, v]) => [k, Number(v)])
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxBars);
  const max = Math.max(...entries.map(([, v]) => v), 1);
  return (
    <div className="space-y-2">
      {entries.map(([label, val]) => (
        <div key={label} className="flex items-center gap-3">
          <span className="text-xs text-gray-600 w-32 truncate shrink-0">{label}</span>
          <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${(val / max) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-700 w-12 text-right shrink-0">{val.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function ForecastChart({ historical, forecastMonths, forecastValues, forecastLower, forecastUpper }) {
  if (!forecastMonths?.length) return <p className="text-xs text-gray-400 py-4 text-center">No forecast data</p>;

  const histEntries = Object.entries(historical || {});
  const allValues   = [
    ...histEntries.map(([, v]) => v),
    ...forecastValues,
    ...forecastUpper,
  ].filter(Boolean);
  const max = Math.max(...allValues, 1);

  const HIST_COLOR   = 'bg-blue-500';
  const FCAST_COLOR  = 'bg-blue-200';
  const INTERVAL_COLOR = 'bg-blue-100';

  return (
    <div className="space-y-1.5">
      {/* Historical */}
      {histEntries.map(([month, val]) => (
        <div key={month} className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 w-16 shrink-0 text-right">{month.slice(2)}</span>
          <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full ${HIST_COLOR} rounded-full`} style={{ width: `${(val / max) * 100}%` }} />
          </div>
          <span className="text-[10px] text-gray-600 w-8 text-right shrink-0">{val}</span>
        </div>
      ))}
      {/* Divider */}
      <div className="flex items-center gap-2 py-0.5">
        <span className="w-16 shrink-0" />
        <div className="flex-1 border-t border-dashed border-blue-300" />
        <span className="text-[10px] text-blue-500 shrink-0">forecast →</span>
      </div>
      {/* Forecast with PI band */}
      {forecastMonths.map((month, i) => {
        const val   = forecastValues[i] ?? 0;
        const lower = forecastLower[i]  ?? 0;
        const upper = forecastUpper[i]  ?? val;
        const lPct  = (lower / max) * 100;
        const wPct  = ((upper - lower) / max) * 100;
        const pPct  = (val / max) * 100;
        return (
          <div key={month} className="flex items-center gap-2">
            <span className="text-[10px] text-blue-400 w-16 shrink-0 text-right">{month.slice(2)}</span>
            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden relative">
              {/* PI band */}
              <div className={`absolute h-full ${INTERVAL_COLOR} rounded-full`}
                style={{ left: `${lPct}%`, width: `${Math.max(wPct, 1)}%` }} />
              {/* Point estimate */}
              <div className={`absolute h-full ${FCAST_COLOR} rounded-full`}
                style={{ width: `${pPct}%` }} />
            </div>
            <span className="text-[10px] text-blue-500 w-8 text-right shrink-0">{Math.round(val)}</span>
          </div>
        );
      })}
      <div className="flex gap-4 mt-2 text-[10px] text-gray-500">
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 bg-blue-500 rounded-sm" /> Historical</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 bg-blue-200 rounded-sm" /> Forecast</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 bg-blue-100 rounded-sm" /> 80% interval</span>
      </div>
    </div>
  );
}

function ChartWarning({ message }) {
  return (
    <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800">
      <span className="text-base mt-0.5">⚠</span>
      <span>{message}</span>
    </div>
  );
}

function DataQualityPanel({ dq, warnings, flags: flagsProp }) {
  const hasWarnings = warnings?.length > 0;
  const flags       = flagsProp ?? dq?.chart_flags ?? {};
  const coerced     = dq?.coerced_counts || {};
  const clipped     = dq?.bounds_clipped || {};
  const coercedTotal = Object.values(coerced).reduce((a, b) => a + b, 0);
  const clippedTotal = Object.values(clipped).reduce((a, b) => a + b, 0);

  return (
    <div className={`rounded-xl border p-5 ${hasWarnings ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{hasWarnings ? '⚠' : '✓'}</span>
        <h2 className="text-sm font-semibold text-gray-900">Data Quality Report</h2>
        <span className="ml-auto text-xs text-gray-500">
          {dq?.files_loaded ?? 0} file{(dq?.files_loaded ?? 0) !== 1 ? 's' : ''} loaded
          {(dq?.files_skipped ?? 0) > 0 && ` · ${dq.files_skipped} skipped (unsupported type)`}
          · {dq?.total_rows_clean?.toLocaleString() ?? 0} rows clean
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <div className="bg-white rounded-lg px-3 py-2 text-center border border-gray-100">
          <p className="text-lg font-bold text-gray-900">{dq?.total_rows_raw?.toLocaleString() ?? '—'}</p>
          <p className="text-[10px] text-gray-500">Raw rows</p>
        </div>
        <div className="bg-white rounded-lg px-3 py-2 text-center border border-gray-100">
          <p className="text-lg font-bold text-gray-900">{coercedTotal.toLocaleString()}</p>
          <p className="text-[10px] text-gray-500">Without arrival time</p>
        </div>
        <div className="bg-white rounded-lg px-3 py-2 text-center border border-gray-100">
          <p className={`text-lg font-bold ${clippedTotal > 0 ? 'text-orange-600' : 'text-gray-900'}`}>{clippedTotal.toLocaleString()}</p>
          <p className="text-[10px] text-gray-500">Out-of-bounds clipped</p>
        </div>
        <div className="bg-white rounded-lg px-3 py-2 text-center border border-gray-100">
          <p className={`text-lg font-bold ${dq?.missing_critical?.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {dq?.missing_critical?.length > 0 ? dq.missing_critical.length : '0'}
          </p>
          <p className="text-[10px] text-gray-500">Critical fields missing</p>
        </div>
      </div>

      {warnings?.length > 0 && (
        <div className="space-y-1 mb-3">
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-yellow-800 flex items-start gap-1.5">
              <span className="shrink-0 mt-0.5">›</span>{w}
            </p>
          ))}
        </div>
      )}

      {Object.keys(flags).length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {Object.entries(flags).map(([k, v]) => (
            <span key={k} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              v === true  ? 'bg-green-100 text-green-700'
            : v === false ? 'bg-red-100 text-red-700'
            :                'bg-gray-100 text-gray-400'
            }`}>
              {k.replace(/_/g, ' ')} {v === true ? '✓' : v === false ? '✗' : '—'}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ModelExplanationCard({ explanation }) {
  if (!explanation?.model_name) return null;
  const { model_name, model_reason, is_reliable, reliability_warning,
          top_features, model_scores, train_days, test_days } = explanation;

  const sortedScores = Object.entries(model_scores || {})
    .sort((a, b) => a[1].mae - b[1].mae);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">AI Model Selection</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Trained on {train_days?.toLocaleString()} days · evaluated on {test_days} day test set
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
            is_reliable ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
          }`}>
            {is_reliable ? 'Reliable' : 'Low reliability'}
          </span>
          <span className="text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-medium">Predictive</span>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-3">
        <p className="text-xs font-semibold text-blue-800">Selected: {model_name}</p>
        <p className="text-xs text-blue-700 mt-0.5">{model_reason}</p>
      </div>

      {reliability_warning && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mb-3">
          <p className="text-xs text-yellow-800">⚠ {reliability_warning}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Candidate model scores */}
        {sortedScores.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1.5">Candidate Model Scores (by MAE)</p>
            <div className="space-y-1">
              {sortedScores.map(([name, s]) => (
                <div key={name} className={`flex items-center justify-between text-xs py-1 px-2 rounded ${
                  name === model_name ? 'bg-blue-50 font-medium' : ''
                }`}>
                  <span className="text-gray-700 truncate">{name === model_name ? '★ ' : ''}{name}</span>
                  <div className="flex gap-3 text-gray-500 shrink-0">
                    <span>MAE <span className="font-medium text-gray-700">{s.mae?.toFixed(2)}</span></span>
                    <span>R² <span className={`font-medium ${(s.r2 ?? 0) >= 0.3 ? 'text-green-700' : 'text-red-600'}`}>{s.r2?.toFixed(2)}</span></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top features */}
        {top_features?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1.5">Top Predictive Features</p>
            <div className="space-y-1">
              {top_features.slice(0, 8).map(({ feature, importance }) => (
                <div key={feature} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 w-32 truncate shrink-0">{feature}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${importance * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-500 w-10 text-right shrink-0">{(importance * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatRow({ label, value }) {
  if (!value && value !== 0) return null;
  const mins = Math.floor(value / 60);
  const secs = Math.round(value % 60);
  const fmt  = (mins === 0 && secs === 0) ? '< 1 min' : mins > 0 ? `${mins}m ${secs.toString().padStart(2, '0')}s` : `${secs}s`;
  return (
    <div className="flex items-center justify-between py-2 text-sm border-b border-gray-100 last:border-0">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium text-gray-900">{fmt}</span>
    </div>
  );
}

function NFPABadge({ pct, compliant, p90 }) {
  if (pct == null) return null;
  const TARGET_S = 300;
  function fmtSec(s) {
    if (s == null) return null;
    const m = Math.floor(s / 60), r = Math.round(s % 60);
    return m > 0 ? `${m}m ${String(r).padStart(2, '0')}s` : `${r}s`;
  }
  const p90Fmt    = fmtSec(p90);
  const exceedBy  = p90 != null ? Math.abs(p90 - TARGET_S) : null;
  const exceedFmt = fmtSec(exceedBy);
  return (
    <div className={`rounded-lg px-4 py-3 text-sm font-medium flex items-center gap-2 ${
      compliant ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
    }`}>
      <span className="text-lg">{compliant ? '✓' : '✗'}</span>
      <div>
        <p className="font-semibold">NFPA 1710 — {compliant ? 'Compliant' : 'Non-compliant'}</p>
        <p className="text-xs font-normal mt-0.5">
          {p90Fmt ? (
            compliant
              ? `P90 total response is ${p90Fmt} — within the 5m 00s NFPA 1710 BLS target (${pct}% of calls)`
              : `P90 total response is ${p90Fmt}, exceeding the 5m 00s target by ${exceedFmt} · ${pct}% of calls within target`
          ) : (
            `${pct}% of responses within 5 min — NFPA 1710 BLS P90 target ≥ 90%`
          )}
        </p>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const router           = useRouter();
  const { agencyId, runId } = useParams();
  const [loading, setLoading] = useState(true);
  const [report,  setReport]  = useState(null);
  const [error,   setError]   = useState('');

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-sm text-gray-500">Loading analytics…</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-3">
      <p className="text-sm text-red-600">{error}</p>
      <Link href={`/platform/${agencyId}`} className="text-sm text-blue-600 hover:underline">
        ← Back to dashboard
      </Link>
    </div>
  );

  const m    = report?.key_metrics || {};
  const cv   = report?.modules?.call_volume || {};
  const rt   = report?.modules?.response_times || {};
  const val  = report?.modules?.validation || {};
  const sf   = report?.modules?.staffing || {};
  const up   = report?.modules?.unit_performance || {};
  const mn   = report?.modules?.municipality || {};
  const fc   = report?.modules?.forecasting || {};
  const hi   = report?.highlights || [];
  const dq   = report?.modules?.data_quality || {};
  const qw   = report?.quality_warnings || [];
  const flags = report?.chart_flags || {};
  const me   = report?.model_explanation || {};

  const totalResp  = rt.total_response  || {};
  const callProc   = rt.call_processing || {};
  const turnout    = rt.turnout         || {};
  const travel     = rt.travel          || {};
  const nfpa       = rt.nfpa_1710       || {};

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/platform/${agencyId}`} className="text-sm text-gray-500 hover:text-gray-700">
            ← Dashboard
          </Link>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-semibold text-gray-800">{report?.agency_name}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
            Analytics Report
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/platform/${agencyId}/analytics/${runId}/report-builder`}
            className="text-xs px-3 py-1.5 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-900 transition-colors"
          >
            Build Report →
          </Link>
          <Link
            href={`/platform/${agencyId}/analytics/${runId}/interactive`}
            className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Interactive Dashboard →
          </Link>
          <span className="text-xs text-gray-400">
            Generated {report?.generated_at ? new Date(report.generated_at).toLocaleString() : '—'}
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Highlights */}
        {hi.length > 0 && (
          <div className="bg-blue-600 text-white rounded-xl p-6">
            <h2 className="text-sm font-semibold mb-3 opacity-80">Key Findings</h2>
            <ul className="space-y-1.5">
              {hi.map((h, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="opacity-60 mt-0.5">›</span>
                  {h}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Data Quality Panel */}
        {(dq?.files_loaded > 0 || dq?.files_skipped > 0 || dq?.files_failed > 0 || qw?.length > 0) && (
          <DataQualityPanel dq={dq} warnings={qw} flags={flags} />
        )}

        {/* Top metrics */}
        <div>
          <SectionHeader title="Summary" sub={`${m.date_range_start ?? '—'} – ${m.date_range_end ?? '—'}`} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard label="Total Calls"         value={m.total_calls?.toLocaleString()} highlight />
            <MetricCard label="Avg Response Time"   value={m.avg_total_response_fmt}        sub="mean" />
            <MetricCard label="Median Response"     value={m.median_response_fmt}           sub="50th pct" />
            <MetricCard label="P90 Response"        value={m.p90_response_fmt}              sub="90th pct" />
          </div>
        </div>

        {/* NFPA compliance — only render when we have valid RT data */}
        {flags.response_time !== false && nfpa.valid !== false && nfpa.pct_within_target != null && (
          <NFPABadge pct={nfpa.pct_within_target} compliant={nfpa.compliant} p90={totalResp.p90} />
        )}
        {(flags.response_time === false || nfpa.valid === false) && (
          <div className="rounded-lg px-4 py-3 text-sm bg-gray-100 text-gray-500 flex items-center gap-2">
            <span className="text-base">—</span>
            <div>
              <p className="font-semibold">NFPA 1710 — Not Available</p>
              <p className="text-xs font-normal mt-0.5">{nfpa.reason || 'Insufficient response-time data to compute compliance.'}</p>
            </div>
          </div>
        )}

        {/* Response time breakdown */}
        {flags.response_time === false ? (
          <ChartWarning message={
            rt.warning ||
            "Response time chart unavailable — date_enroute / date_arrived columns were not found or produced no valid intervals after bounds enforcement."
          } />
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <SectionHeader title="Response Time Intervals" sub="All values are medians in mm:ss" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <div>
                <StatRow label="Call Processing (call → dispatch)"  value={callProc.median} />
                <StatRow label="Turnout (dispatch → en route)"      value={turnout.median} />
                <StatRow label="Travel (en route → on scene)"       value={travel.median} />
                <StatRow label="Total Response (call → on scene)"   value={totalResp.median} />
              </div>
              <div>
                <StatRow label="Total Response — Mean"   value={totalResp.mean} />
                <StatRow label="Total Response — P90"    value={totalResp.p90} />
                <StatRow label="Total Response — P95"    value={totalResp.p95} />
                <StatRow label="Total Response — Max (raw)" value={totalResp.max} />
              </div>
            </div>
          </div>
        )}

        {/* Call volume by type */}
        {Object.keys(cv.by_incident_type || {}).length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <SectionHeader title="Call Volume by Incident Type" sub="Top 12 types" />
            <BarChart data={cv.by_incident_type} maxBars={12} />
          </div>
        )}

        {/* Call volume by month */}
        {Object.keys(cv.by_month || {}).length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <SectionHeader title="Call Volume by Month" />
            <BarChart data={cv.by_month} maxBars={24} />
          </div>
        )}

        {/* Calls by day & hour */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {Object.keys(cv.by_day_of_week || {}).length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <SectionHeader title="Calls by Day of Week" />
              <BarChart data={cv.by_day_of_week} maxBars={7} />
            </div>
          )}
          {flags.call_volume_by_hour === false ? (
            <ChartWarning message="Hourly distribution unavailable — the call_date field appears to be date-only (no time component). Hour-of-day chart is disabled." />
          ) : Object.keys(cv.by_hour || {}).length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <SectionHeader title="Calls by Hour of Day" />
              <BarChart data={cv.by_hour} maxBars={24} />
            </div>
          ) : null}
        </div>

        {/* Unit activity */}
        {Object.keys(cv.by_unit || {}).length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <SectionHeader title="Top Units by Call Volume" sub="Top 15 units" />
            <BarChart data={cv.by_unit} maxBars={15} />
          </div>
        )}

        {/* Response time by priority */}
        {Object.keys(rt.by_priority || {}).length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <SectionHeader title="Response Time by Priority" sub="Median total response in seconds" />
            <div className="divide-y divide-gray-100">
              {Object.entries(rt.by_priority).map(([prio, stats]) => (
                <div key={prio} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-gray-700 font-medium">Priority {prio}</span>
                  <div className="flex gap-6 text-xs text-gray-500">
                    <span><span className="font-medium text-gray-800">{stats.count?.toLocaleString()}</span> calls</span>
                    <span>Median <span className="font-medium text-gray-800">{stats.median}s</span></span>
                    <span>P90 <span className="font-medium text-gray-800">{stats.p90}s</span></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Validation summary */}
        {val.files_validated > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <SectionHeader title="Data Validation" sub={`${val.files_validated} file${val.files_validated > 1 ? 's' : ''} checked`} />
            <div className="flex gap-6 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{val.files_passed}</p>
                <p className="text-xs text-gray-500">Passed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{val.files_failed}</p>
                <p className="text-xs text-gray-500">Failed</p>
              </div>
            </div>
            {(val.results || []).filter(r => r.warnings?.length > 0).length === 0 && (
              <p className="text-xs text-green-600 flex items-center gap-1">✓ All checks passed</p>
            )}
            {(val.results || []).filter(r => r.warnings?.length > 0).map(r => (
              <div key={r.file_id} className="mb-2">
                <p className="text-xs font-medium text-gray-700">{r.original_filename}</p>
                {r.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-yellow-700 ml-2">⚠ {w}</p>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Unit Performance (Operational+ tier) */}
        {up.total_units > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-start justify-between mb-4">
              <SectionHeader
                title="Unit Performance"
                sub={`${up.total_units} units · ${up.flagged_units?.length ?? 0} flagged below NFPA target`}
              />
              <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium shrink-0">Operational</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Unit', 'Calls', 'Median RT', 'P90 RT', 'NFPA P90', 'Util. hrs'].map(h => (
                      <th key={h} className="pb-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {Object.entries(up.units || {}).map(([unit, s]) => {
                    const flagged = up.flagged_units?.includes(unit);
                    return (
                      <tr key={unit} className={flagged ? 'bg-red-50' : ''}>
                        <td className="py-2 pr-3 font-medium text-gray-900">
                          {unit}
                          {flagged && <span className="ml-1 text-[10px] text-red-600">⚠</span>}
                        </td>
                        <td className="py-2 pr-3 text-gray-700">{s.calls}</td>
                        <td className="py-2 pr-3 text-gray-700">{s.response_median != null ? `${Math.round(s.response_median)}s` : '—'}</td>
                        <td className={`py-2 pr-3 font-medium ${s.response_p90 > 300 ? 'text-red-600' : 'text-gray-700'}`}>
                          {s.response_p90 != null ? `${Math.round(s.response_p90)}s` : '—'}
                        </td>
                        <td className="py-2 pr-3">
                          {s.response_p90 != null ? (
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                              s.response_p90 <= 300 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {s.response_p90 <= 300 ? '✓ Pass' : '✗ Fail'}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-2 text-gray-500 text-xs">{s.utilisation_hours != null ? `${s.utilisation_hours}h` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Municipality Analysis (Operational+ tier) */}
        {mn.total_municipalities > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-start justify-between mb-4">
              <SectionHeader
                title="Municipality Breakdown"
                sub={`${mn.total_municipalities} areas · ${mn.flagged_municipalities?.length ?? 0} flagged`}
              />
              <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium shrink-0">Operational</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Municipality', 'Calls', 'Median RT', 'P90 RT', 'NFPA P90', 'Top Incident'].map(h => (
                      <th key={h} className="pb-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {Object.entries(mn.municipalities || {}).map(([name, s]) => {
                    const flagged = mn.flagged_municipalities?.includes(name);
                    const topType = s.top_incident_types ? Object.keys(s.top_incident_types)[0] : '—';
                    return (
                      <tr key={name} className={flagged ? 'bg-red-50' : ''}>
                        <td className="py-2 pr-3 font-medium text-gray-900">
                          {name}
                          {flagged && <span className="ml-1 text-[10px] text-red-600">⚠</span>}
                        </td>
                        <td className="py-2 pr-3 text-gray-700">{s.calls}</td>
                        <td className="py-2 pr-3 text-gray-700">{s.response_median != null ? `${Math.round(s.response_median)}s` : '—'}</td>
                        <td className={`py-2 pr-3 font-medium ${s.response_p90 > 300 ? 'text-red-600' : 'text-gray-700'}`}>
                          {s.response_p90 != null ? `${Math.round(s.response_p90)}s` : '—'}
                        </td>
                        <td className="py-2 pr-3">
                          {s.response_p90 != null ? (
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                              s.response_p90 <= 300 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {s.response_p90 <= 300 ? '✓ Pass' : '✗ Fail'}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-2 text-gray-500 text-xs truncate max-w-[120px]">{topType}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AI Model Explanation (Predictive+ tier) */}
        {me?.model_name && <ModelExplanationCard explanation={me} />}

        {/* Forecasting (Predictive+ tier) */}
        {fc.call_volume_forecast?.forecast_months?.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-start justify-between mb-4">
              <SectionHeader
                title="12-Month Call Volume Forecast"
                sub={`Trend: ${fc.call_volume_forecast.trend_direction} · slope ${fc.call_volume_forecast.trend_slope > 0 ? '+' : ''}${fc.call_volume_forecast.trend_slope} calls/day`}
              />
              <span className="text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-medium shrink-0">Predictive</span>
            </div>
            <ForecastChart
              historical={fc.call_volume_forecast.historical}
              forecastMonths={fc.call_volume_forecast.forecast_months}
              forecastValues={fc.call_volume_forecast.forecast_values}
              forecastLower={fc.call_volume_forecast.forecast_lower}
              forecastUpper={fc.call_volume_forecast.forecast_upper}
            />
          </div>
        )}

        {/* Attrition risk (Predictive+ tier) */}
        {fc.attrition_risk?.risk_level && (
          <div className={`rounded-xl border p-5 ${
            fc.attrition_risk.risk_level === 'high'   ? 'bg-red-50 border-red-200' :
            fc.attrition_risk.risk_level === 'medium' ? 'bg-yellow-50 border-yellow-200' :
            'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl">
                {fc.attrition_risk.risk_level === 'high' ? '🔴' : fc.attrition_risk.risk_level === 'medium' ? '🟡' : '🟢'}
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Staffing Attrition Risk — <span className="capitalize">{fc.attrition_risk.risk_level}</span>
                </p>
                <p className="text-xs text-gray-500">Based on overtime burden, coverage gaps, and roster size</p>
              </div>
              <span className="ml-auto text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-medium shrink-0">Predictive</span>
            </div>
            {(fc.attrition_risk.indicators || []).map((ind, i) => (
              <p key={i} className="text-xs text-gray-700 mt-1 ml-9">• {ind}</p>
            ))}
            {fc.attrition_risk.indicators?.length === 0 && (
              <p className="text-xs text-green-700 ml-9">No significant attrition risk indicators detected.</p>
            )}
          </div>
        )}

        {/* Staffing summary (Operational+ tier) */}
        {sf.unique_employees > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <SectionHeader title="Staffing Overview" sub={`${sf.total_records} records · ${sf.unique_employees} unique staff`} />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{sf.unique_employees}</p>
                <p className="text-xs text-gray-500">Unique Staff</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{sf.avg_hours_per_shift ?? '—'}</p>
                <p className="text-xs text-gray-500">Avg Hours/Shift</p>
              </div>
              <div className="text-center">
                <p className={`text-2xl font-bold ${sf.overtime_pct > 20 ? 'text-red-600' : 'text-gray-900'}`}>
                  {sf.overtime_pct ?? 0}%
                </p>
                <p className="text-xs text-gray-500">Overtime Rate</p>
              </div>
              <div className="text-center">
                <p className={`text-2xl font-bold ${sf.staffing_gaps?.length > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {sf.staffing_gaps?.length ?? 0}
                </p>
                <p className="text-xs text-gray-500">Staffing Gap Days</p>
              </div>
            </div>
            {Object.keys(sf.by_shift || {}).length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-600 mb-2">By Shift</p>
                <BarChart data={sf.by_shift} maxBars={6} />
              </div>
            )}
            {Object.keys(sf.by_position || {}).length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-600 mb-2">By Position / Rank</p>
                <BarChart data={sf.by_position} maxBars={8} />
              </div>
            )}
            {(sf.warnings || []).map((w, i) => (
              <p key={i} className="text-xs text-yellow-700 mt-2 flex items-start gap-1">
                <span>⚠</span> {w}
              </p>
            ))}
          </div>
        )}

        <div className="text-center pt-4 pb-8">
          <Link
            href={`/platform/${agencyId}`}
            className="text-sm text-blue-600 hover:underline"
          >
            ← Back to dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
