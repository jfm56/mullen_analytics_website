'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const STATUS_STYLES = {
  queued:    'bg-gray-100 text-gray-600',
  running:   'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  failed:    'bg-red-100 text-red-700',
  active:    'bg-green-100 text-green-700',
  inactive:  'bg-gray-100 text-gray-500',
  suspended: 'bg-red-100 text-red-700',
};

const TIER_COLORS = {
  essential:   'bg-blue-100 text-blue-700',
  operational: 'bg-purple-100 text-purple-700',
  predictive:  'bg-indigo-100 text-indigo-700',
  enterprise:  'bg-amber-100 text-amber-700',
};

function StatBadge({ label, value, color = 'bg-gray-100 text-gray-700' }) {
  return (
    <div className={`rounded-xl p-4 ${color}`}>
      <p className="text-2xl font-bold">{value ?? '—'}</p>
      <p className="text-xs mt-0.5 opacity-75">{label}</p>
    </div>
  );
}

function Tab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        active
          ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
    </button>
  );
}

export default function AdminPanel() {
  const router = useRouter();
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState('agencies');
  const [stats,     setStats]     = useState(null);
  const [agencies,  setAgencies]  = useState([]);
  const [runs,      setRuns]      = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [error,     setError]     = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [statsRes, agRes, runsRes, logsRes] = await Promise.all([
          fetch('/api/proxy/admin/stats',          { credentials: 'include' }),
          fetch('/api/proxy/admin/agencies',       { credentials: 'include' }),
          fetch('/api/proxy/admin/pipeline/runs',  { credentials: 'include' }),
          fetch('/api/proxy/admin/audit-logs',     { credentials: 'include' }),
        ]);

        if (statsRes.status === 401) { router.replace('/portal/login'); return; }
        if (statsRes.status === 403) { setError('Admin access required.'); setLoading(false); return; }

        if (statsRes.ok)  setStats(await statsRes.json());
        if (agRes.ok)     setAgencies(await agRes.json());
        if (runsRes.ok)   setRuns(await runsRes.json());
        if (logsRes.ok)   setAuditLogs(await logsRes.json());
      } catch {
        setError('Failed to load admin data.');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-sm text-gray-500">Loading admin panel…</p>
    </div>
  );
  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-3">
      <p className="text-sm text-red-600">{error}</p>
      <Link href="/platform" className="text-sm text-blue-600 hover:underline">← Back to platform</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/platform" className="text-sm text-gray-500 hover:text-gray-700">← Platform</Link>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-semibold text-gray-800">Admin Panel</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Admin Only</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* Platform stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatBadge label="Total agencies"   value={stats.total_agencies}   color="bg-blue-50 text-blue-800" />
            <StatBadge label="Active agencies"  value={stats.active_agencies}  color="bg-green-50 text-green-800" />
            <StatBadge label="Files uploaded"   value={stats.total_files}      color="bg-purple-50 text-purple-800" />
            <StatBadge label="Pipeline runs"    value={stats.total_runs}       color="bg-gray-100 text-gray-800" />
            <StatBadge label="Completed runs"   value={stats.completed_runs}   color="bg-green-50 text-green-800" />
            <StatBadge label="Active runs"      value={stats.active_runs}      color={stats.active_runs > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'} />
          </div>
        )}

        {/* Tab nav */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          <Tab label={`Agencies (${agencies.length})`}   active={tab === 'agencies'}  onClick={() => setTab('agencies')} />
          <Tab label={`Pipeline Runs (${runs.length})`} active={tab === 'runs'}      onClick={() => setTab('runs')} />
          <Tab label={`Audit Log (${auditLogs.length})`} active={tab === 'audit'}    onClick={() => setTab('audit')} />
        </div>

        {/* Agencies tab */}
        {tab === 'agencies' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Agency', 'Type', 'Tier', 'State', 'Files', 'Runs', 'Status', 'Created', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {agencies.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{a.agency_name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{a.agency_type ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${TIER_COLORS[a.subscription_tier] || 'bg-gray-100 text-gray-600'}`}>
                        {a.subscription_tier}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{a.state ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{a.file_count}</td>
                    <td className="px-4 py-3 text-gray-700">{a.pipeline_runs}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[a.status] || 'bg-gray-100 text-gray-600'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(a.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <Link href={`/platform/${a.id}`} className="text-xs text-blue-600 hover:underline">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {agencies.length === 0 && (
              <p className="text-center py-8 text-sm text-gray-400">No agencies yet</p>
            )}
          </div>
        )}

        {/* Pipeline runs tab */}
        {tab === 'runs' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Run ID', 'Agency', 'Status', 'Started', 'Completed', 'Error', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {runs.map(r => {
                  const ag = agencies.find(a => a.id === r.agency_id);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{r.id.slice(0, 8)}…</td>
                      <td className="px-4 py-3 text-gray-700 text-xs">{ag?.agency_name ?? r.agency_id.slice(0, 8)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[r.status] || ''}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{r.started_at ? new Date(r.started_at).toLocaleString() : '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{r.completed_at ? new Date(r.completed_at).toLocaleString() : '—'}</td>
                      <td className="px-4 py-3 text-red-500 text-xs max-w-[200px] truncate">{r.error_message ?? ''}</td>
                      <td className="px-4 py-3">
                        {r.status === 'completed' && (
                          <Link href={`/platform/${r.agency_id}/analytics/${r.id}`} className="text-xs text-blue-600 hover:underline">Report</Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {runs.length === 0 && (
              <p className="text-center py-8 text-sm text-gray-400">No pipeline runs yet</p>
            )}
          </div>
        )}

        {/* Audit log tab */}
        {tab === 'audit' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['When', 'Action', 'User', 'Agency', 'Resource', 'IP'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {auditLogs.map(log => {
                  const ag = agencies.find(a => a.id === log.agency_id);
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{log.action}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs font-mono">{log.user_id ? log.user_id.slice(0, 8) : '—'}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{ag?.agency_name ?? (log.agency_id ? log.agency_id.slice(0, 8) : '—')}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {log.resource_type ? `${log.resource_type}` : '—'}
                        {log.resource_id ? <span className="text-gray-400"> /{log.resource_id.slice(0, 6)}</span> : ''}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{log.ip_address ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {auditLogs.length === 0 && (
              <p className="text-center py-8 text-sm text-gray-400">No audit logs yet</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
