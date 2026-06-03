'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Database, Plus, RefreshCw, Search, AlertTriangle,
  CheckCircle2, ExternalLink, Upload,
} from 'lucide-react';
import ErrorAlert from '@/components/ui/ErrorAlert';

function YearBadge({ year, status }) {
  const colors = {
    cleaned:  'bg-green-50 text-green-700 border-green-200',
    uploaded: 'bg-amber-50 text-amber-700 border-amber-200',
    missing:  'bg-gray-100 text-gray-400 border-gray-200 opacity-60',
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${colors[status] || colors.missing}`}>
      {year}
    </span>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export default function AdminDatasetsPage() {
  const router = useRouter();
  const [authOk, setAuthOk]     = useState(false);
  const [groups, setGroups]     = useState([]);
  const [clients, setClients]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [createModal, setCreateModal] = useState(false);
  const [form, setForm]         = useState({ client_id: '', name: '', description: '', start_year: '', end_year: '' });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [gRes, uRes] = await Promise.all([
        fetch('/api/proxy/datasets', { credentials: 'include' }),
        fetch('/api/proxy/users/', { credentials: 'include' }),
      ]);
      if (!gRes.ok) throw new Error(`Datasets: ${gRes.status}`);
      const [gData, uData] = await Promise.all([gRes.json(), uRes.ok ? uRes.json() : []]);
      setGroups(Array.isArray(gData) ? gData : []);
      setClients(Array.isArray(uData) ? uData.filter(u => u.role === 'client') : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/proxy/auth/session', { credentials: 'include' });
        const s   = await res.json();
        if (!s.authenticated || s.profile?.role !== 'admin') { router.replace('/portal/login'); return; }
        setAuthOk(true);
        load();
      } catch { router.replace('/portal/login'); }
    })();
  }, [router, load]);

  const filtered = groups.filter(g =>
    !search ||
    g.name?.toLowerCase().includes(search.toLowerCase()) ||
    g.client_name?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate() {
    if (!form.client_id || !form.name) return;
    setCreating(true);
    try {
      const body = {
        client_id:   form.client_id,
        name:        form.name,
        description: form.description || undefined,
        start_year:  form.start_year ? Number(form.start_year) : undefined,
        end_year:    form.end_year   ? Number(form.end_year)   : undefined,
      };
      const res = await fetch('/api/proxy/datasets', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || `Status ${res.status}`); }
      const created = await res.json();
      setCreateModal(false);
      setForm({ client_id: '', name: '', description: '', start_year: '', end_year: '' });
      router.push(`/admin/data/datasets/${created.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  if (!authOk || loading) return (
    <div className="flex items-center justify-center h-64 text-sm text-gray-400">
      <RefreshCw size={16} className="animate-spin mr-2" /> Loading datasets…
    </div>
  );

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-5">

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Database size={20} /> Multi-Year Datasets
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Group yearly EMSCharts exports for year-over-year analysis.
          </p>
        </div>
        <button
          onClick={() => setCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={15} /> New Dataset Group
        </button>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError('')} />

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search datasets or clients…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button onClick={load} disabled={loading} className="p-2 border rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm gap-2">
            <Database size={22} />
            {search ? 'No datasets match your search.' : 'No dataset groups yet. Create one to start.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b">
                <tr className="text-left text-[10px] uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">Dataset</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Years Uploaded</th>
                  <th className="px-4 py-3 font-medium">Missing</th>
                  <th className="px-4 py-3 font-medium">Uploads</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(g => (
                  <tr key={g.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{g.name}</p>
                      {g.description && <p className="text-gray-400 truncate max-w-[200px]">{g.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{g.client_name || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {g.uploaded_years?.length > 0
                          ? g.uploaded_years.map(y => (
                              <YearBadge
                                key={y}
                                year={y}
                                status={g.cleaned_years?.includes(y) ? 'cleaned' : 'uploaded'}
                              />
                            ))
                          : <span className="text-gray-400 italic">None</span>
                        }
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {g.missing_years?.length > 0 ? (
                        <div className="flex items-center gap-1 text-amber-600">
                          <AlertTriangle size={11} />
                          <span>{g.missing_years.join(', ')}</span>
                        </div>
                      ) : g.uploaded_years?.length > 0 ? (
                        <CheckCircle2 size={13} className="text-green-500" />
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{g.upload_count}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        g.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'
                      }`}>{g.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {g.cleaned_years?.length >= 2 && (
                          <Link
                            href={`/admin/dashboards/year-over-year/${g.id}`}
                            className="flex items-center gap-1 text-purple-600 hover:underline text-[11px]"
                          >
                            YoY Dashboard
                          </Link>
                        )}
                        <Link
                          href={`/admin/data/datasets/${g.id}`}
                          className="flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          Open <ExternalLink size={11} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && (
          <div className="px-4 py-2 border-t text-[11px] text-gray-400 bg-gray-50">
            {filtered.length} of {groups.length} dataset groups
          </div>
        )}
      </div>

      {createModal && (
        <Modal title="New Dataset Group" onClose={() => setCreateModal(false)}>
          <div className="space-y-3 mb-5">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Client *</label>
              <select
                value={form.client_id}
                onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a client…</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.full_name || c.email}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Dataset Name *</label>
              <input
                type="text"
                placeholder="SBES 365 EMSCharts 2021–2025"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={2}
                placeholder="Annual EMSCharts exports for year-over-year comparison."
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Start Year</label>
                <input type="number" min={2015} max={2030} placeholder="2021"
                  value={form.start_year} onChange={e => setForm(p => ({ ...p, start_year: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">End Year</label>
                <input type="number" min={2015} max={2030} placeholder="2025"
                  value={form.end_year} onChange={e => setForm(p => ({ ...p, end_year: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setCreateModal(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={handleCreate} disabled={creating || !form.name || !form.client_id}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {creating ? 'Creating…' : 'Create Dataset Group'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
