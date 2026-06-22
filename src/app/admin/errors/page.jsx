'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Bug, AlertTriangle, CheckCircle2, RefreshCw, X, Monitor, Server, CircleAlert,
} from 'lucide-react';
import { admin } from '@/lib/api';
import ErrorAlert from '@/components/ui/ErrorAlert';

const SOURCE = {
  server: { label: 'Server', cls: 'bg-slate-100 text-slate-700 border-slate-200', Icon: Server },
  client: { label: 'Browser', cls: 'bg-sky-100 text-sky-700 border-sky-200', Icon: Monitor },
};
const fmt = (s) => (s ? new Date(s).toLocaleString() : '—');

function Stat({ label, value, tone }) {
  return (
    <div className="bg-white border rounded-xl px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-gray-400">{label}</div>
      <div className={`text-2xl font-bold ${tone || 'text-gray-900'}`}>{value}</div>
    </div>
  );
}

export default function AdminErrorsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [showResolved, setShowResolved] = useState(false);
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (sourceFilter !== 'all') params.source = sourceFilter;
      if (!showResolved) params.resolved = false;
      setData(await admin.errors(params));
    } catch (e) {
      setError(e.message || 'Failed to load errors');
    } finally {
      setLoading(false);
    }
  }, [sourceFilter, showResolved]);

  useEffect(() => { load(); }, [load]);

  async function toggleResolve(id) {
    try {
      await admin.resolveError(id);
      load();
    } catch (e) {
      setError(e.message || 'Failed to update');
    }
  }

  async function openDetail(id) {
    setDetail({ loading: true });
    try {
      setDetail(await admin.errorDetail(id));
    } catch (e) {
      setError(e.message || 'Failed to load detail');
      setDetail(null);
    }
  }

  const counts = data?.counts || {};
  const errors = data?.errors || [];
  const issues = data?.issues || [];

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Bug size={20} /> Errors &amp; Issues</h1>
          <p className="text-sm text-gray-500 mt-0.5">Application errors users hit, plus issues they’ve reported.</p>
        </div>
        <button onClick={load} disabled={loading} className="p-2 border rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50" title="Refresh">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError('')} />

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Open errors" value={counts.open_errors ?? '—'} tone={counts.open_errors ? 'text-red-600' : 'text-gray-900'} />
        <Stat label="Errors (24h)" value={counts.errors_24h ?? '—'} tone={counts.errors_24h ? 'text-amber-600' : 'text-gray-900'} />
        <Stat label="Open issues" value={counts.open_issues ?? '—'} tone={counts.open_issues ? 'text-indigo-600' : 'text-gray-900'} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}
          className="text-sm border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">All sources</option>
          <option value="server">Server (500s)</option>
          <option value="client">Browser (JS)</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} className="rounded accent-blue-600" />
          Show resolved
        </label>
      </div>

      {/* Errors table */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center gap-2 text-sm font-semibold text-gray-900">
          <AlertTriangle size={15} className="text-amber-500" /> Application errors
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-28 text-sm text-gray-400"><RefreshCw size={14} className="animate-spin mr-2" /> Loading…</div>
        ) : errors.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-28 text-gray-400 text-sm gap-2">
            <CheckCircle2 size={22} className="text-green-500" /> No {showResolved ? '' : 'unresolved '}errors. 🎉
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b">
                <tr className="text-left text-[10px] uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-2.5 font-medium">When</th>
                  <th className="px-4 py-2.5 font-medium">Source</th>
                  <th className="px-4 py-2.5 font-medium">Error</th>
                  <th className="px-4 py-2.5 font-medium">Where</th>
                  <th className="px-4 py-2.5 font-medium">User</th>
                  <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {errors.map((e) => {
                  const src = SOURCE[e.source] || SOURCE.server;
                  return (
                    <tr key={e.id} className={`hover:bg-gray-50 ${e.resolved ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{fmt(e.created_at)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${src.cls}`}>
                          <src.Icon size={10} /> {src.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 max-w-[360px]">
                        <div className="font-medium text-gray-800 truncate" title={e.message}>
                          {e.error_type && <span className="text-gray-400">{e.error_type}: </span>}{e.message}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 truncate max-w-[160px]" title={e.path}>
                        {e.method ? `${e.method} ` : ''}{e.path || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{e.user || <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1.5">
                          {(e.has_stacktrace || e.source) && (
                            <button onClick={() => openDetail(e.id)} className="text-[10px] px-2 py-1 border rounded-md text-gray-600 hover:bg-gray-50">Detail</button>
                          )}
                          <button onClick={() => toggleResolve(e.id)}
                            title={e.resolved ? 'Mark unresolved' : 'Mark resolved'}
                            className={`p-1.5 rounded-md transition-colors ${e.resolved ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}>
                            <CheckCircle2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reported issues */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center gap-2 text-sm font-semibold text-gray-900">
          <CircleAlert size={15} className="text-indigo-500" /> User-reported issues
          <span className="text-[11px] font-normal text-gray-400">(from the portal Feedback page)</span>
        </div>
        {issues.length === 0 ? (
          <div className="px-4 py-6 text-sm text-gray-400 text-center">No issues reported.</div>
        ) : (
          <div className="divide-y">
            {issues.map((i) => (
              <div key={i.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-gray-800">{i.title}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full border bg-gray-50 text-gray-600 whitespace-nowrap">{i.status}</span>
                </div>
                {i.body && <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">{i.body}</p>}
                <p className="text-[11px] text-gray-400 mt-1">{i.user || 'Unknown'} · {fmt(i.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">Error detail</h3>
              <button onClick={() => setDetail(null)} className="p-1 text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            {detail.loading ? (
              <div className="flex items-center justify-center h-24 text-sm text-gray-400"><RefreshCw size={14} className="animate-spin mr-2" /> Loading…</div>
            ) : (
              <div className="space-y-3 text-sm">
                <div><span className="text-gray-400">Message: </span><span className="text-gray-800 font-medium">{detail.error_type}: {detail.message}</span></div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div><span className="text-gray-400">Source: </span>{detail.source}</div>
                  <div><span className="text-gray-400">Status: </span>{detail.status_code || '—'}</div>
                  <div><span className="text-gray-400">Where: </span>{detail.method ? `${detail.method} ` : ''}{detail.path || '—'}</div>
                  <div><span className="text-gray-400">User: </span>{detail.user || '—'}</div>
                  <div><span className="text-gray-400">IP: </span>{detail.ip_address || '—'}</div>
                  <div><span className="text-gray-400">When: </span>{fmt(detail.created_at)}</div>
                </div>
                {detail.user_agent && <div className="text-[11px] text-gray-400 break-words">{detail.user_agent}</div>}
                {detail.stacktrace && (
                  <pre className="text-[10px] leading-relaxed bg-gray-900 text-gray-100 rounded-lg p-3 overflow-x-auto max-h-80 whitespace-pre-wrap">{detail.stacktrace}</pre>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
