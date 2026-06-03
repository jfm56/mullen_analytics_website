'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FolderOpen, Plus, Search, RefreshCw, ExternalLink, Archive } from 'lucide-react';
import ErrorAlert from '@/components/ui/ErrorAlert';

const STATUS_STYLES = {
  PLANNING:  'bg-purple-50 text-purple-700 border-purple-200',
  ACTIVE:    'bg-green-50 text-green-700 border-green-200',
  ON_HOLD:   'bg-amber-50 text-amber-700 border-amber-200',
  COMPLETED: 'bg-blue-50 text-blue-700 border-blue-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
  active:    'bg-green-50 text-green-700 border-green-200',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  on_hold:   'bg-amber-50 text-amber-700 border-amber-200',
  archived:  'bg-gray-50 text-gray-500 border-gray-200',
};

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export default function AdminProjectsPage() {
  const router = useRouter();
  const [authOk, setAuthOk] = useState(false);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);

  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ client_id: '', name: '', description: '', status: 'PLANNING', phase: 'discovery', deadline: '' });
  const [creating, setCreating] = useState(false);

  const clientMap = useMemo(() => {
    const m = {};
    clients.forEach(c => { m[c.id] = c.full_name || c.email || c.id; });
    return m;
  }, [clients]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [pRes, cRes] = await Promise.all([
        fetch('/api/proxy/projects/', { credentials: 'include' }),
        fetch('/api/proxy/users/', { credentials: 'include' }),
      ]);
      if (!pRes.ok) throw new Error(`Projects: ${pRes.status}`);
      const [pData, cData] = await Promise.all([pRes.json(), cRes.ok ? cRes.json() : []]);
      setProjects(Array.isArray(pData) ? pData : []);
      setClients(Array.isArray(cData) ? cData.filter(u => u.role === 'client') : []);
    } catch (e) {
      setError(e.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/proxy/auth/session', { credentials: 'include' });
        const s = await res.json();
        if (!s.authenticated || s.profile?.role !== 'admin') {
          router.replace('/portal/login');
          return;
        }
        setAuthOk(true);
        loadData();
      } catch {
        router.replace('/portal/login');
      }
    })();
  }, [router, loadData]);

  const filtered = useMemo(() => projects.filter(p => {
    const isArchived = !!p.archived_at;
    if (!showArchived && isArchived) return false;
    const clientName = clientMap[p.client_id] || '';
    const matchSearch = !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      clientName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  }), [projects, search, statusFilter, showArchived, clientMap]);

  async function handleCreate() {
    if (!createForm.name || !createForm.client_id) return;
    setCreating(true);
    setError('');
    try {
      const body = {
        client_id: createForm.client_id,
        name: createForm.name,
        status: createForm.status,
        phase: createForm.phase,
      };
      if (createForm.description) body.description = createForm.description;
      if (createForm.deadline) body.deadline = new Date(createForm.deadline).toISOString();

      const res = await fetch('/api/proxy/projects/', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Status ${res.status}`);
      }
      const created = await res.json();
      setCreateModal(false);
      setCreateForm({ client_id: '', name: '', description: '', status: 'PLANNING', phase: 'discovery', deadline: '' });
      router.push(`/admin/projects/${created.id}`);
    } catch (e) {
      setError(e.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  }

  if (!authOk) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        <RefreshCw size={16} className="animate-spin mr-2" /> Checking access…
      </div>
    );
  }

  const archivedCount = projects.filter(p => p.archived_at).length;

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FolderOpen size={20} /> Projects
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {projects.length} project{projects.length !== 1 ? 's' : ''} across all clients
          </p>
        </div>
        <button
          onClick={() => setCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={15} /> New Project
        </button>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError('')} />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by project name or client…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="text-sm border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All statuses</option>
          <option value="PLANNING">Planning</option>
          <option value="ACTIVE">Active</option>
          <option value="ON_HOLD">On Hold</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        {archivedCount > 0 && (
          <button
            onClick={() => setShowArchived(v => !v)}
            className={`flex items-center gap-1.5 text-sm px-3 py-2 border rounded-lg transition-colors ${showArchived ? 'bg-gray-100 border-gray-400' : 'bg-white hover:bg-gray-50'}`}
          >
            <Archive size={13} />
            {showArchived ? 'Hide archived' : `Show archived (${archivedCount})`}
          </button>
        )}
        <button onClick={loadData} disabled={loading} className="p-2 border rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors" title="Refresh">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-sm text-gray-400">
            <RefreshCw size={14} className="animate-spin mr-2" /> Loading projects…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm gap-2">
            <FolderOpen size={24} />
            {search || statusFilter !== 'all' ? 'No projects match your filters.' : 'No projects yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b">
                <tr className="text-left text-[10px] uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Phase</th>
                  <th className="px-4 py-3 font-medium">Deadline</th>
                  <th className="px-4 py-3 font-medium">Value</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(p => (
                  <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${p.archived_at ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {p.archived_at && <Archive size={11} className="text-gray-400 flex-shrink-0" />}
                        <div>
                          <p className="font-medium text-gray-900">{p.name}</p>
                          {p.description && <p className="text-gray-400 truncate max-w-[200px]">{p.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/clients/${p.client_id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {clientMap[p.client_id] || <span className="font-mono text-gray-400">{String(p.client_id).slice(0, 8)}…</span>}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_STYLES[p.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{p.phase || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {p.deadline ? (
                        <span className={new Date(p.deadline) < new Date() && p.status !== 'COMPLETED' ? 'text-red-600 font-medium' : ''}>
                          {new Date(p.deadline).toLocaleDateString()}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.contract_value != null
                        ? `$${Number(p.contract_value).toLocaleString()}`
                        : p.budget_cents != null
                        ? `$${(p.budget_cents / 100).toLocaleString()}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/projects/${p.id}`}
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                      >
                        Open <ExternalLink size={11} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && (
          <div className="px-4 py-2 border-t text-[11px] text-gray-400 bg-gray-50">
            {filtered.length} of {projects.length} projects
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {createModal && (
        <Modal title="New Project" onClose={() => setCreateModal(false)}>
          <div className="space-y-3 mb-5">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Client *</label>
              <select
                value={createForm.client_id}
                onChange={e => setCreateForm(p => ({ ...p, client_id: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a client…</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.full_name || c.email}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Project Name *</label>
              <input
                type="text"
                placeholder="Q1 EMS Analytics Dashboard"
                value={createForm.name}
                onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={2}
                placeholder="Brief project description…"
                value={createForm.description}
                onChange={e => setCreateForm(p => ({ ...p, description: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={createForm.status}
                  onChange={e => setCreateForm(p => ({ ...p, status: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PLANNING">Planning</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Phase</label>
                <select
                  value={createForm.phase}
                  onChange={e => setCreateForm(p => ({ ...p, phase: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="discovery">Discovery</option>
                  <option value="build">Build</option>
                  <option value="validate">Validate</option>
                  <option value="deliver">Deliver</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Deadline</label>
              <input
                type="date"
                value={createForm.deadline}
                onChange={e => setCreateForm(p => ({ ...p, deadline: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setCreateModal(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button
              onClick={handleCreate}
              disabled={creating || !createForm.name || !createForm.client_id}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create Project'}
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
}
