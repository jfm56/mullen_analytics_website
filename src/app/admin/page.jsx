'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users, Upload, BarChart2, MessageSquare, AlertTriangle,
  CheckCircle2, RefreshCw, Database, Server, HardDrive,
  Mail, Plus, Clock,
  XCircle, HelpCircle, Zap, ArrowRight,
} from 'lucide-react';
import { auth } from '@/lib/api';
import MetricCard from '@/components/ui/MetricCard';
import StatusBadge from '@/components/ui/StatusBadge';
import ErrorAlert from '@/components/ui/ErrorAlert';
import { getAdminDashboardSummary } from '@/lib/api/adminDashboard';
import { fmtDate } from '@/lib/datetime';

// ── helpers ──────────────────────────────────────────────────────────────────

function HealthIcon({ status }) {
  if (status === 'ok')      return <CheckCircle2 size={15} className="text-green-500" />;
  if (status === 'warning') return <AlertTriangle size={15} className="text-amber-500" />;
  if (status === 'error')   return <XCircle size={15} className="text-red-500" />;
  return <HelpCircle size={15} className="text-gray-400" />;
}

function Panel({ title, action, children, className = '' }) {
  return (
    <div className={`bg-white border rounded-xl shadow-sm overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function EmptyRow({ msg }) {
  return <p className="text-sm text-gray-400 text-center py-4">{msg}</p>;
}

const EMPTY_SUMMARY = {
  total_clients: 0, active_clients: 0, total_uploads: 0,
  dashboards_ready: 0, failed_uploads: 0, unread_messages: 0,
  open_tasks: 0, data_quality_warnings: 0,
  recent_uploads: [], clients_needing_attention: [],
  recent_messages: [], tasks_due_soon: [],
  system_health: { backend: 'unknown', database: 'unknown', storage: 'unknown', email: 'unknown', analytics_pipeline: 'unknown', environment: 'unknown' },
};

// ── main component ────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const router = useRouter();
  const [authState, setAuthState] = useState('loading'); // loading | ok | denied
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError('');
    try {
      const data = await getAdminDashboardSummary();
      setSummary(data);
      setLastRefreshed(new Date());
    } catch (e) {
      setSummaryError(e.message || 'Unable to load dashboard data.');
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const session = await auth.getSession();
        if (!mounted) return;
        if (!session.authenticated) {
          router.replace('/admin/login');
          return;
        }
        if (!session.profile || session.profile.role !== 'admin') {
          setAuthState('denied');
          return;
        }
        setAuthState('ok');
        loadSummary();
      } catch {
        router.replace('/admin/login');
      }
    })();
    return () => { mounted = false; };
  }, [router, loadSummary]);

  if (authState === 'loading') {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        <RefreshCw size={16} className="animate-spin mr-2" /> Checking access…
      </div>
    );
  }
  if (authState === 'denied') {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center text-gray-600 text-sm">
        Access denied. This page requires admin privileges.
      </div>
    );
  }

  if (summaryLoading && !lastRefreshed && !summaryError) {
    return <div role="status" className="flex h-64 items-center justify-center gap-2 text-sm text-gray-500">
      <RefreshCw size={16} className="animate-spin" aria-hidden="true" /> Loading overview…
    </div>;
  }

  if (summaryError && !lastRefreshed) {
    return <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
      <ErrorAlert message={summaryError} />
      <p className="text-sm text-gray-500">Dashboard totals are unavailable. You can still navigate to clients, uploads and messages.</p>
      <button onClick={loadSummary} disabled={summaryLoading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">{summaryLoading ? 'Retrying…' : 'Retry overview'}</button>
    </div>;
  }

  const { system_health: health = {} } = summary;
  const env = health.environment || 'unknown';
  const environmentLabel = env.charAt(0).toUpperCase() + env.slice(1);
  const isProd = env === 'production';

  const quickActions = [
    { label: 'Upload data', href: '/admin/data', primary: true, Icon: Upload },
    { label: 'Manage clients', href: '/admin/clients', Icon: Plus },
    { label: 'Open messages', href: '/admin/messages', Icon: MessageSquare },
    { label: 'Analytics workspace', href: '/admin/dashboard', Icon: BarChart2 },
  ];
  const workflow = [
    { label: '1. Upload source data', href: '/admin/data' },
    { label: '2. Review column mapping', href: '/admin/column-mapping' },
    { label: '3. Inspect cleaned data', href: '/admin/data-explorer' },
    { label: '4. Open dataset comparisons', href: '/admin/data/datasets' },
  ];

  const healthItems = [
    { label: 'Backend API',        key: 'backend',            Icon: Server },
    { label: 'Database',           key: 'database',           Icon: Database },
    { label: 'File Storage',       key: 'storage',            Icon: HardDrive },
    { label: 'Email Provider',     key: 'email',              Icon: Mail },
    { label: 'Analytics Pipeline', key: 'analytics_pipeline', Icon: Zap },
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Review client work, resolve issues and move data through the analytics workflow.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className={`text-xs px-2 py-1 rounded-full font-medium border ${isProd ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
            {environmentLabel}
          </span>
          <span className="text-xs px-2 py-1 rounded-full font-medium border bg-purple-50 text-purple-700 border-purple-200">
            Admin
          </span>
          {lastRefreshed && (
            <span className="text-xs text-gray-400 hidden sm:inline">
              Updated {lastRefreshed.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={loadSummary}
            disabled={summaryLoading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 border rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={13} className={summaryLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {summaryError && (
        <ErrorAlert message={summaryError} onDismiss={() => setSummaryError('')} />
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard label="Total Clients"    value={summary.total_clients}        sub="Managed accounts"      icon={<Users size={14} />}         color="blue"   href="/admin/clients"       loading={summaryLoading} />
        <MetricCard label="Active Clients"   value={summary.active_clients}       sub="Currently active"      icon={<CheckCircle2 size={14} />}   color="green"  href="/admin/clients"       loading={summaryLoading} />
        <MetricCard label="Data Uploads"     value={summary.total_uploads}        sub="EMSCharts CSVs"        icon={<Upload size={14} />}         color="blue"   href="/admin/data"          loading={summaryLoading} />
        <MetricCard label="Cleaned Uploads" value={summary.dashboards_ready}     sub="Marked CLEANED"  icon={<BarChart2 size={14} />}      color="green"  href="/admin/dashboard"     loading={summaryLoading} />
      </div>
      <section aria-labelledby="attention-heading" className="space-y-3">
        <div><h2 id="attention-heading" className="text-sm font-semibold text-gray-900">Needs attention</h2>
          <p className="text-xs text-gray-500 mt-1">Open an area below to review outstanding work.</p></div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard label="Failed Uploads"   value={summary.failed_uploads}       sub="Need admin review"     icon={<XCircle size={14} />}        color={summary.failed_uploads > 0 ? 'red' : 'gray'}   href="/admin/data"          loading={summaryLoading} />
        <MetricCard label="Unread Messages"  value={summary.unread_messages}      sub="Client communication"  icon={<MessageSquare size={14} />}  color={summary.unread_messages > 0 ? 'amber' : 'gray'} href="/admin/messages"      loading={summaryLoading} />
        <MetricCard label="Open Tasks"       value={summary.open_tasks}           sub="Pending work"          icon={<Clock size={14} />}          color="purple" href="/admin/projects" loading={summaryLoading} />
        <MetricCard label="Quality Warnings" value={summary.data_quality_warnings} sub="Need column mapping"       icon={<AlertTriangle size={14} />}  color={summary.data_quality_warnings > 0 ? 'amber' : 'gray'} href="/admin/column-mapping" loading={summaryLoading} />
      </div>

      </section>

      {/* ── Main grid: 2/3 left + 1/3 right ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* LEFT column */}
        <div className="xl:col-span-2 space-y-6">

          {/* Clients Needing Attention */}
          <Panel
            title="Clients Needing Attention"
            action={<Link href="/admin/clients" className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">All clients <ArrowRight size={12} /></Link>}
          >
            {summary.clients_needing_attention.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-4 py-3">
                <CheckCircle2 size={15} /> No client issues reported.
              </div>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-xs min-w-[440px]">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wide text-gray-400 border-b">
                      <th className="pb-2 pr-3">Client</th>
                      <th className="pb-2 pr-3">Issue</th>
                      <th className="pb-2 pr-3">Last Upload</th>
                      <th className="pb-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {summary.clients_needing_attention.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="py-2 pr-3">
                          <p className="font-medium text-gray-800">{c.full_name || c.email}</p>
                          {c.company && <p className="text-gray-400">{c.company}</p>}
                        </td>
                        <td className="py-2 pr-3">
                          <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-medium">
                            <AlertTriangle size={9} /> {c.issue}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-gray-400">{c.last_upload ? fmtDate(c.last_upload) : 'Never'}</td>
                        <td className="py-2">
                          <Link href={`/admin/clients/${c.id}`} className="text-blue-600 hover:underline">View</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {/* Recent Uploads */}
          <Panel
            title="Recent data uploads"
            action={<Link href="/admin/data" className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">View all <ArrowRight size={12} /></Link>}
          >
            {summary.recent_uploads.length === 0 ? (
              <div className="text-center py-6">
                <Upload size={28} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">No data uploads yet.</p>
                <p className="text-xs text-gray-400 mt-0.5 mb-3">Choose a client and upload source data to begin processing.</p>
                <Link href="/admin/data" className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-1.5">
                  <Upload size={12} /> Upload Data
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-xs min-w-[520px]">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wide text-gray-400 border-b">
                      <th className="pb-2 pr-3">Client</th>
                      <th className="pb-2 pr-3">File</th>
                      <th className="pb-2 pr-3">Status</th>
                      <th className="pb-2 pr-3">Uploaded</th>
                      <th className="pb-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {summary.recent_uploads.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="py-2 pr-3 font-medium text-gray-800">{u.client_name}</td>
                        <td className="py-2 pr-3 text-gray-500 truncate max-w-[160px]">{u.original_filename}</td>
                        <td className="py-2 pr-3"><StatusBadge status={u.upload_status} type="upload" /></td>
                        <td className="py-2 pr-3 text-gray-400">{u.created_at ? fmtDate(u.created_at) : '—'}</td>
                        <td className="py-2 flex items-center gap-2">
                          <Link href={`/admin/data-explorer/${u.id}`} className="text-blue-600 hover:underline">Explore</Link>
                          {u.upload_status === 'CLEANED' && (
                            <Link href={`/admin/data-explorer/${u.id}`} className="text-purple-600 hover:underline">Analytics</Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {/* Recent Messages */}
          <Panel
            title="Recent Client Messages"
            action={<Link href="/admin/messages" className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">All messages <ArrowRight size={12} /></Link>}
          >
            {summary.recent_messages.length === 0 ? (
              <EmptyRow msg="No recent client messages." />
            ) : (
              <div className="space-y-2">
                {summary.recent_messages.map(m => (
                  <div key={m.id} className="flex items-start justify-between gap-3 py-2 border-b last:border-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-xs text-gray-800">{m.client_name}</span>
                        {!m.read_at && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">New</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 truncate">{m.subject}</p>
                      <p className="text-[10px] text-gray-400 truncate">{m.preview}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[10px] text-gray-400">{m.created_at ? fmtDate(m.created_at) : '—'}</p>
                      <Link href="/admin/messages" className="text-[10px] text-blue-600 hover:underline">Open</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

        </div>

        {/* RIGHT column */}
        <div className="space-y-6">

          <Panel title="Data workflow">
            <p className="text-xs text-gray-500 mb-3">Use these steps for each upload. Check its processing status in Uploads.</p>
            <div className="space-y-2">
              {workflow.map(({ label, href }) => <Link key={href} href={href} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm text-gray-700 hover:border-blue-300 hover:text-blue-600">
                {label}<ArrowRight size={14} aria-hidden="true" />
              </Link>)}
            </div>
          </Panel>

          {/* Quick Actions */}
          <Panel title="Quick Actions">
            <div className="space-y-1.5">
              {quickActions.map(({ label, href, primary, Icon }) => (
                <Link
                  key={href + label}
                  href={href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors w-full ${
                    primary
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 border border-transparent hover:border-gray-200'
                  }`}
                >
                  <Icon size={14} className="flex-shrink-0" />
                  {label}
                </Link>
              ))}
            </div>
          </Panel>

          {/* System Health */}
          <Panel title="Reported system status">
            <p className="text-xs text-gray-500 mb-3">Reported by the summary API; this is not an end-to-end service test.</p>
            <div className="space-y-2">
              {healthItems.map(({ label, key, Icon }) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Icon size={14} className="text-gray-400" />
                    {label}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <HealthIcon status={health[key]} />
                    <span className={`text-xs font-medium capitalize ${
                      health[key] === 'ok' ? 'text-green-600' :
                      health[key] === 'error' ? 'text-red-600' :
                      health[key] === 'warning' ? 'text-amber-600' : 'text-gray-400'
                    }`}>
                      {health[key] || 'unknown'}
                    </span>
                  </div>
                </div>
              ))}
              <div className="pt-2 mt-2 border-t flex items-center justify-between text-xs text-gray-500">
                <span>Environment</span>
                <span className={`font-medium px-2 py-0.5 rounded-full ${isProd ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                  {environmentLabel}
                </span>
              </div>
            </div>
          </Panel>

          {/* Tasks Due Soon */}
          <Panel
            title="Tasks Due Soon"
          >
            {summary.tasks_due_soon.length === 0 ? (
              <EmptyRow msg="No tasks due in the next 7 days." />
            ) : (
              <div className="space-y-2">
                {summary.tasks_due_soon.map(t => (
                  <div key={t.id} className="flex items-start justify-between gap-2 py-2 border-b last:border-0">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{t.title}</p>
                      <p className="text-[10px] text-gray-400">{t.client_name}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[10px] text-gray-500">{t.due_date ? fmtDate(t.due_date) : '—'}</p>
                      <StatusBadge status={t.status} type="task" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

        </div>
      </div>
    </div>
  );
}
