'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

const FILE_TYPE_LABELS = {
  dispatch:    'Dispatch / Calls',
  staffing:    'Staffing',
  termination: 'Terminations',
  payroll:     'Payroll',
  mutual_aid:  'Mutual Aid',
  population:  'Population / Municipality',
  other:       'Other',
};

const TIER_FEATURES = {
  essential:   ['File Upload', 'Data Validation', 'Call Volume', 'Response Times', 'Basic Report'],
  operational: ['Everything in Essential', 'Staffing Analysis', 'Forecasting', 'Municipality Analysis', 'Payroll Analytics'],
  predictive:  ['Everything in Operational', 'Call Volume Forecast', 'Attrition Forecast', 'AI Insights', 'LLM Assistant'],
  enterprise:  ['Custom Pipelines', 'Dedicated Onboarding', 'API Integrations', 'Custom Dashboards', 'Priority Support'],
};

const STATUS_STYLES = {
  queued:    'bg-gray-100 text-gray-600',
  running:   'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  failed:    'bg-red-100 text-red-700',
};

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function TrendSparkline({ points, valueKey, color, target, formatVal, invertColor = false }) {
  const values  = points.map(p => p[valueKey]).filter(v => v != null);
  if (values.length < 2) return <p className="text-xs text-gray-400 py-2">Not enough data</p>;

  const min  = Math.min(...values);
  const max  = Math.max(...values);
  const span = max - min || 1;
  const H    = 48;
  const W    = 100;
  const step = W / (values.length - 1);

  const pts = values.map((v, i) => {
    const x = i * step;
    const y = H - ((v - min) / span) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const last  = values[values.length - 1];
  const first = values[0];
  const delta = last - first;
  const up    = delta > 0;
  const good  = invertColor ? !up : up;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-12" preserveAspectRatio="none">
        {target != null && (() => {
          const ty = H - ((Math.min(target, max) - min) / span) * H;
          return <line x1="0" x2={W} y1={ty} y2={ty} stroke="#d1fae5" strokeWidth="1" strokeDasharray="3 2" />;
        })()}
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
        <circle cx={(values.length - 1) * step} cy={H - ((last - min) / span) * H} r="2.5" fill={color} />
      </svg>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs font-semibold text-gray-800">{formatVal ? formatVal(last) : last}</span>
        <span className={`text-[10px] font-medium ${good ? 'text-green-600' : 'text-red-500'}`}>
          {delta > 0 ? '↑' : delta < 0 ? '↓' : '→'}
          {Math.abs(delta).toFixed(delta < 10 ? 1 : 0)}
        </span>
      </div>
    </div>
  );
}

function RunStatusDot({ status }) {
  if (status === 'running') {
    return <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500" />
    </span>;
  }
  return <span className={`inline-block h-2 w-2 rounded-full ${
    status === 'completed' ? 'bg-green-500' :
    status === 'failed'    ? 'bg-red-500'   : 'bg-gray-400'
  }`} />;
}

export default function AgencyDashboard() {
  const router        = useRouter();
  const { agencyId }  = useParams();
  const pollRef       = useRef(null);

  const [loading,      setLoading]      = useState(true);
  const [agency,       setAgency]       = useState(null);
  const [files,        setFiles]        = useState([]);
  const [runs,         setRuns]         = useState([]);
  const [liveReport,   setLiveReport]   = useState(null);
  const [trends,       setTrends]       = useState([]);
  const [triggering,   setTriggering]   = useState(false);
  const [triggerError, setTriggerError] = useState('');
  const [error,        setError]        = useState('');

  const fetchRuns = useCallback(async () => {
    const res = await fetch(`/api/proxy/agencies/${agencyId}/pipeline/runs`, { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    setRuns(data);
    // If a newly-completed run exists and we have no report, fetch it
    const done = data.find(r => r.status === 'completed');
    if (done) {
      const rptRes = await fetch(
        `/api/proxy/agencies/${agencyId}/pipeline/runs/${done.id}/report`,
        { credentials: 'include' }
      );
      if (rptRes.ok) setLiveReport(await rptRes.json());
    }
  }, [agencyId]);

  useEffect(() => {
    if (!agencyId) return;
    (async () => {
      try {
        const [agRes, filesRes, runsRes] = await Promise.all([
          fetch(`/api/proxy/agencies/${agencyId}`,               { credentials: 'include' }),
          fetch(`/api/proxy/agencies/${agencyId}/files`,         { credentials: 'include' }),
          fetch(`/api/proxy/agencies/${agencyId}/pipeline/runs`, { credentials: 'include' }),
        ]);
        if (agRes.status === 401) { router.replace('/portal/login'); return; }
        if (agRes.status === 403) { setError('Access denied.'); setLoading(false); return; }
        if (!agRes.ok)            { setError('Agency not found.'); setLoading(false); return; }
        setAgency(await agRes.json());
        setFiles(filesRes.ok ? await filesRes.json() : []);
        const runsData = runsRes.ok ? await runsRes.json() : [];
        setRuns(runsData);
        // Fetch the latest completed report for live stats
        const latestDone = runsData.find(r => r.status === 'completed');
        if (latestDone) {
          const rptRes = await fetch(
            `/api/proxy/agencies/${agencyId}/pipeline/runs/${latestDone.id}/report`,
            { credentials: 'include' }
          );
          if (rptRes.ok) setLiveReport(await rptRes.json());
        }
        // Fetch multi-run trend data
        const trendRes = await fetch(
          `/api/proxy/agencies/${agencyId}/pipeline/trends`,
          { credentials: 'include' }
        );
        if (trendRes.ok) {
          const td = await trendRes.json();
          setTrends(td.points || []);
        }
      } catch {
        setError('Failed to load agency data.');
      } finally {
        setLoading(false);
      }
    })();
  }, [agencyId, router]);

  // Poll while any run is active
  useEffect(() => {
    const hasActive = runs.some(r => r.status === 'queued' || r.status === 'running');
    if (hasActive && !pollRef.current) {
      pollRef.current = setInterval(fetchRuns, 3000);
    } else if (!hasActive && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [runs, fetchRuns]);

  const handleTrigger = async () => {
    setTriggering(true);
    setTriggerError('');
    try {
      let columnMap = {};
      try { columnMap = JSON.parse(localStorage.getItem(`column_map:${agencyId}`) || '{}'); } catch {}
      const res = await fetch(`/api/proxy/agencies/${agencyId}/pipeline/run`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ column_map: columnMap }),
      });
      if (res.status === 409) {
        setTriggerError('A pipeline run is already in progress.');
      } else if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setTriggerError(d.detail || 'Failed to trigger pipeline.');
      } else {
        await fetchRuns();
      }
    } catch {
      setTriggerError('Network error. Please try again.');
    } finally {
      setTriggering(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-sm text-gray-500">Loading…</p>
    </div>;
  }
  if (error) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-sm text-red-600">{error}</p>
    </div>;
  }

  const byType         = files.reduce((acc, f) => { acc[f.file_type] = (acc[f.file_type] || 0) + 1; return acc; }, {});
  const totalMB        = (files.reduce((s, f) => s + (f.file_size_bytes || 0), 0) / 1024 / 1024).toFixed(1);
  const activeRun      = runs.find(r => r.status === 'queued' || r.status === 'running');
  const latestComplete = runs.find(r => r.status === 'completed');
  const hasDispatch    = files.some(f => f.file_type === 'dispatch');
  const lm             = liveReport?.key_metrics ?? null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/platform" className="text-sm text-gray-500 hover:text-gray-700">← All agencies</Link>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-semibold text-gray-800">{agency?.agency_name}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
            agency?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}>{agency?.status}</span>
        </div>
        <Link
          href={`/platform/${agencyId}/upload`}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload Data
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Stats row — shows live report metrics when available */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {lm ? (
            <>
              <StatCard
                label="Total Calls Analyzed"
                value={lm.total_calls?.toLocaleString() ?? '—'}
                sub={lm.date_range_start ? `${lm.date_range_start} – ${lm.date_range_end}` : undefined}
              />
              <StatCard
                label="Avg Response Time"
                value={lm.avg_total_response_fmt ?? '—'}
                sub={`median ${lm.median_response_fmt ?? '—'}`}
              />
              <StatCard
                label="NFPA 1710"
                value={lm.nfpa_1710_pct != null ? `${lm.nfpa_1710_pct}%` : '—'}
                sub={lm.nfpa_1710_compliant === true ? '✓ Compliant' : lm.nfpa_1710_compliant === false ? '✗ Non-compliant' : 'within 6 min'}
              />
              <StatCard
                label="Pipeline runs"
                value={runs.length}
                sub={`${runs.filter(r => r.status === 'completed').length} completed`}
              />
            </>
          ) : (
            <>
              <StatCard label="Total files"   value={files.length} />
              <StatCard label="Data uploaded" value={`${totalMB} MB`} />
              <StatCard label="Subscription"  value={agency?.subscription_tier} sub="tier" />
              <StatCard label="Pipeline runs" value={runs.length} sub={runs.length === 0 ? 'no runs yet' : `${runs.filter(r => r.status === 'completed').length} completed`} />
            </>
          )}
        </div>

        {/* Pipeline trigger banner */}
        <div className={`rounded-xl border p-5 mb-6 ${
          activeRun
            ? 'bg-yellow-50 border-yellow-200'
            : latestComplete
            ? 'bg-green-50 border-green-200'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              {activeRun ? (
                <>
                  <p className="text-sm font-semibold text-yellow-900 flex items-center gap-2">
                    <RunStatusDot status={activeRun.status} />
                    Pipeline {activeRun.status === 'running' ? 'running…' : 'queued'}
                  </p>
                  <p className="text-xs text-yellow-700 mt-0.5">
                    Started {activeRun.started_at ? new Date(activeRun.started_at).toLocaleTimeString() : 'just now'} · Results will appear when complete
                  </p>
                </>
              ) : latestComplete ? (
                <>
                  <p className="text-sm font-semibold text-green-900">Last run completed</p>
                  <p className="text-xs text-green-700 mt-0.5">
                    {new Date(latestComplete.completed_at).toLocaleString()} ·{' '}
                    <Link href={`/platform/${agencyId}/analytics/${latestComplete.id}`} className="underline hover:no-underline">
                      View analytics →
                    </Link>
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-blue-900">Run the analytics pipeline</p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    {hasDispatch
                      ? 'Dispatch data detected — ready to analyze call volume and response times.'
                      : 'Upload at least one dispatch file to generate call volume and response time analytics.'}
                  </p>
                </>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={handleTrigger}
                disabled={!!activeRun || triggering || !files.length}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeRun || triggering || !files.length
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {triggering ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {activeRun ? 'In Progress…' : 'Run Pipeline'}
              </button>
              {triggerError && <p className="text-xs text-red-600">{triggerError}</p>}
              {!files.length && <p className="text-xs text-gray-400">Upload files first</p>}
            </div>
          </div>
        </div>

        {/* Performance trends (visible once 2+ completed runs exist) */}
        {trends.length >= 2 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Performance Trends</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* NFPA compliance sparkline */}
              <div>
                <p className="text-xs text-gray-500 mb-2">NFPA 1710 Compliance %</p>
                <TrendSparkline
                  points={trends}
                  valueKey="nfpa_pct"
                  color="#3b82f6"
                  target={90}
                  formatVal={v => `${v?.toFixed(1)}%`}
                />
              </div>
              {/* Avg response time sparkline */}
              <div>
                <p className="text-xs text-gray-500 mb-2">Avg Response Time (s)</p>
                <TrendSparkline
                  points={trends}
                  valueKey="avg_response"
                  color="#8b5cf6"
                  target={null}
                  formatVal={v => `${Math.round(v)}s`}
                  invertColor
                />
              </div>
              {/* Call volume sparkline */}
              <div>
                <p className="text-xs text-gray-500 mb-2">Total Calls per Run</p>
                <TrendSparkline
                  points={trends}
                  valueKey="total_calls"
                  color="#10b981"
                  target={null}
                  formatVal={v => v?.toLocaleString()}
                />
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-3">
              Based on {trends.length} completed run{trends.length !== 1 ? 's' : ''} · oldest → newest
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Files list */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Recent Uploads</h2>
              <Link href={`/platform/${agencyId}/upload`} className="text-xs text-blue-600 hover:underline">
                Upload new file
              </Link>
            </div>
            {files.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-gray-400 mb-3">No files uploaded yet</p>
                <Link href={`/platform/${agencyId}/upload`} className="text-sm text-blue-600 font-medium hover:underline">
                  Upload your first dataset →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {files.slice(0, 8).map(f => (
                  <div key={f.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800 truncate font-medium">{f.original_filename}</p>
                      <p className="text-xs text-gray-400">
                        {FILE_TYPE_LABELS[f.file_type] || f.file_type} · {f.file_size_bytes ? `${(f.file_size_bytes / 1024).toFixed(0)} KB` : '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        f.status === 'uploaded'   ? 'bg-blue-100 text-blue-700' :
                        f.status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                        f.status === 'processed'  ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>{f.status}</span>
                      <span className="text-xs text-gray-400">{new Date(f.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Side panels */}
          <div className="space-y-4">
            {/* Pipeline run history */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Pipeline Runs</h2>
              {runs.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">No runs yet</p>
              ) : (
                <div className="space-y-2">
                  {runs.slice(0, 5).map(run => (
                    <div key={run.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <RunStatusDot status={run.status} />
                        <span className="text-xs text-gray-600 truncate">
                          {new Date(run.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_STYLES[run.status] || 'bg-gray-100 text-gray-600'}`}>
                          {run.status}
                        </span>
                        {run.status === 'completed' && (
                          <Link
                            href={`/platform/${agencyId}/analytics/${run.id}`}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Data coverage */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Data Coverage</h2>
              {Object.keys(FILE_TYPE_LABELS).map(type => (
                <div key={type} className="flex items-center justify-between py-1.5 text-xs">
                  <span className="text-gray-600">{FILE_TYPE_LABELS[type]}</span>
                  <span className={`font-medium ${byType[type] ? 'text-green-600' : 'text-gray-300'}`}>
                    {byType[type] ? `${byType[type]} file${byType[type] > 1 ? 's' : ''}` : '—'}
                  </span>
                </div>
              ))}
            </div>

            {/* Plan features */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Your Plan</h2>
              <p className="text-xs font-semibold text-blue-700 capitalize mb-2">{agency?.subscription_tier} Tier</p>
              <ul className="space-y-1">
                {(TIER_FEATURES[agency?.subscription_tier] || []).map(f => (
                  <li key={f} className="text-xs text-gray-500 flex items-center gap-1.5">
                    <svg className="w-3 h-3 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
