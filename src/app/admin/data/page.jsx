'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth, dataUploads } from '@/lib/api';
import EMSDashboard from '@/components/EMSDashboard';

const STATUS_COLORS = {
  UPLOADED:  'bg-blue-100 text-blue-800',
  CLEANING:  'bg-yellow-100 text-yellow-800',
  CLEANED:   'bg-green-100 text-green-800',
  FAILED:    'bg-red-100 text-red-800',
};

async function apiFetch(path, opts = {}) {
  const res = await fetch(`/api/proxy${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export default function AdminDataPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [clients, setClients] = useState([]);
  const [filterClient, setFilterClient] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [cleaningId, setCleaningId] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ client_id: '', project_id: '' });
  const [editProjects, setEditProjects] = useState([]);
  const [editSaving, setEditSaving] = useState(false);

  const [form, setForm] = useState({
    client_id: '',
    project_id: '',
    notes: '',
    source_system: 'EMSCHARTS',
    file: null,
  });

  const loadUploads = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterClient) params.set('client_id', filterClient);
      if (filterProject) params.set('project_id', filterProject);
      const data = await apiFetch(`/data/uploads?${params}`);
      setUploads(data);
    } catch (e) {
      setError(e.message);
    }
  }, [filterClient, filterProject]);

  useEffect(() => {
    const init = async () => {
      try {
        const s = await auth.getSession();
        if (!s.authenticated || s.profile?.role !== 'admin') {
          router.replace('/portal/login');
          return;
        }
        setSession(s);
        const usersData = await apiFetch('/users/');
        setClients(usersData.filter(u => u.role === 'client'));
      } catch {
        router.replace('/portal/login');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  useEffect(() => {
    if (session) loadUploads();
  }, [session, loadUploads]);

  const handleUpload = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.file) { setError('Please select a CSV file.'); return; }
    if (!form.client_id) { setError('Please select a client.'); return; }

    const fd = new FormData();
    fd.append('file', form.file);
    fd.append('client_id', form.client_id);
    if (form.project_id) fd.append('project_id', form.project_id);
    if (form.notes) fd.append('notes', form.notes);
    fd.append('source_system', form.source_system);

    setUploading(true);
    try {
      await fetch('/api/proxy/data/uploads', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      }).then(async r => {
        if (!r.ok) { const e = await r.json(); throw new Error(e.detail || 'Upload failed'); }
        return r.json();
      });
      setSuccess('Upload successful!');
      setForm({ client_id: '', project_id: '', notes: '', source_system: 'EMSCHARTS', file: null });
      await loadUploads();
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleClean = async (uploadId) => {
    setError(''); setSuccess('');
    setCleaningId(uploadId);
    try {
      await fetch(`/api/proxy/data/uploads/${uploadId}/clean`, {
        method: 'POST',
        credentials: 'include',
      }).then(async r => {
        if (!r.ok) { const e = await r.json(); throw new Error(e.detail || 'Cleaning failed'); }
        return r.json();
      });
      setSuccess('Cleaning complete!');
      await loadUploads();
    } catch (e) {
      setError(e.message);
    } finally {
      setCleaningId(null);
    }
  };

  const openEdit = async (upload) => {
    setEditForm({ client_id: upload.client_id, project_id: upload.project_id || '' });
    setEditProjects([]);
    setEditTarget(upload);
    try {
      const projs = await apiFetch(`/projects/client/${upload.client_id}`);
      setEditProjects(projs);
    } catch { /* no projects is fine */ }
  };

  const handleEditClientChange = async (clientId) => {
    setEditForm(f => ({ ...f, client_id: clientId, project_id: '' }));
    setEditProjects([]);
    if (!clientId) return;
    try {
      const projs = await apiFetch(`/projects/client/${clientId}`);
      setEditProjects(projs);
    } catch { /* fine */ }
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    setEditSaving(true);
    setError('');
    try {
      await apiFetch(`/data/uploads/${editTarget.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          client_id: editForm.client_id || null,
          project_id: editForm.project_id || null,
        }),
      });
      setSuccess('Upload updated.');
      setEditTarget(null);
      await loadUploads();
    } catch (e) {
      setError(e.message);
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (uploadId) => {
    if (!confirm('Delete this upload and all associated files?')) return;
    setError('');
    try {
      await fetch(`/api/proxy/data/uploads/${uploadId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      await loadUploads();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleViewResults = async (upload) => {
    try {
      const results = await apiFetch(`/data/uploads/${upload.id}/cleaning-results`);
      setSelectedResult({ upload, results });
    } catch (e) {
      setError(e.message);
    }
  };

  const handleViewDashboard = async (upload) => {
    setError('');
    setDashboardLoading(true);
    try {
      const data = await dataUploads.getDashboard(upload.id);
      setDashboard({ upload, metrics: data.metrics, generatedAt: data.generated_at });
      setTimeout(() => document.getElementById('admin-ems-dashboard')?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) { setError(e.message || 'Failed to load dashboard'); }
    finally { setDashboardLoading(false); }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 safe-bottom-content">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Uploads</h1>
          <p className="text-sm text-gray-500 mt-1">EMSCharts CSV upload and cleaning pipeline</p>
        </div>
        <Link href="/admin" className="text-sm text-blue-600 hover:underline">← Admin</Link>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">{success}</div>}

      {/* Upload Form */}
      <div className="bg-white border rounded-lg p-6 mb-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Upload EMSCharts CSV</h2>
        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
            <select
              value={form.client_id}
              onChange={e => setForm(f => ({ ...f, client_id: e.target.value, project_id: '' }))}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="">Select client…</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.full_name || c.email}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source System</label>
            <select
              value={form.source_system}
              onChange={e => setForm(f => ({ ...f, source_system: e.target.value }))}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="EMSCHARTS">EMSCharts</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project (optional)</label>
            <input
              type="text"
              placeholder="Project ID (UUID)"
              value={form.project_id}
              onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <input
              type="text"
              placeholder="Notes…"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">CSV File *</label>
            <input
              type="file"
              accept=".csv"
              onChange={e => setForm(f => ({ ...f, file: e.target.files[0] || null }))}
              className="w-full text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">Only .csv files accepted. Max {100} MB.</p>
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={uploading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded text-sm font-medium"
            >
              {uploading ? 'Uploading…' : 'Upload CSV'}
            </button>
          </div>
        </form>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          value={filterClient}
          onChange={e => setFilterClient(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="">All clients</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.full_name || c.email}</option>
          ))}
        </select>
        <button
          onClick={() => { setFilterClient(''); setFilterProject(''); }}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Clear filters
        </button>
      </div>

      {/* Uploads Table */}
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Filename', 'Client', 'Source', 'Status', 'Rows', 'Uploaded', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {uploads.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No uploads yet</td></tr>
            ) : uploads.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">{u.original_filename}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{u.client_id.slice(0, 8)}…</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{u.source_system}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[u.upload_status] || 'bg-gray-100 text-gray-700'}`}>
                    {u.upload_status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {u.row_count_original != null ? `${u.row_count_original} → ${u.row_count_cleaned ?? '?'}` : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <a
                      href={`/api/proxy/data/uploads/${u.id}/download-original`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Original
                    </a>
                    {u.upload_status === 'CLEANED' && (
                      <>
                        <a
                          href={`/api/proxy/data/uploads/${u.id}/download-cleaned`}
                          className="text-xs text-green-600 hover:underline"
                        >
                          Cleaned
                        </a>
                        <button
                          onClick={() => handleViewResults(u)}
                          className="text-xs text-purple-600 hover:underline"
                        >
                          Results
                        </button>
                        <button
                          onClick={() => handleViewDashboard(u)}
                          disabled={dashboardLoading}
                          className="text-xs text-blue-600 hover:underline disabled:opacity-50 font-semibold"
                        >
                          {dashboardLoading && dashboard?.upload?.id === u.id ? '…' : 'Dashboard'}
                        </button>
                        <a
                          href={`/admin/data-explorer/${u.id}`}
                          className="text-xs text-indigo-600 hover:underline font-semibold"
                        >
                          Explore
                        </a>
                      </>
                    )}
                    {(u.upload_status === 'UPLOADED' || u.upload_status === 'FAILED') && (
                      <button
                        onClick={() => handleClean(u.id)}
                        disabled={cleaningId === u.id}
                        className="text-xs text-orange-600 hover:underline disabled:opacity-50"
                      >
                        {cleaningId === u.id ? 'Cleaning…' : 'Clean'}
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(u)}
                      className="text-xs text-gray-500 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Inline EMS Analytics Dashboard */}
      {dashboard && (
        <div id="admin-ems-dashboard" className="mt-6 bg-white border rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">📊 EMS Analytics Dashboard</h2>
              <p className="text-xs text-gray-500 mt-0.5">{dashboard.upload.original_filename}</p>
            </div>
            <button onClick={() => setDashboard(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>
          <EMSDashboard
            metrics={dashboard.metrics}
            generatedAt={dashboard.generatedAt}
            uploadId={dashboard.upload?.id}
            onRefresh={() => handleViewDashboard(dashboard.upload)}
          />
        </div>
      )}

      {/* Edit Upload Modal */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold">Edit Upload</h3>
                <button onClick={() => setEditTarget(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
              </div>
              <p className="text-xs text-gray-400 mb-4 truncate">{editTarget.original_filename}</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                  <select
                    value={editForm.client_id}
                    onChange={e => handleEditClientChange(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    <option value="">Select client…</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.full_name || c.email}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project <span className="text-gray-400 font-normal">(optional)</span></label>
                  <select
                    value={editForm.project_id}
                    onChange={e => setEditForm(f => ({ ...f, project_id: e.target.value }))}
                    disabled={!editForm.client_id}
                    className="w-full border rounded px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <option value="">No project</option>
                    {editProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {editForm.client_id && editProjects.length === 0 && (
                    <p className="text-xs text-gray-400 mt-1">No projects for this client</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setEditTarget(null)}
                  className="px-4 py-2 text-sm border rounded text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={editSaving || !editForm.client_id}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
                >
                  {editSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cleaning Results Modal */}
      {selectedResult && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold">Cleaning Results</h3>
                <button onClick={() => setSelectedResult(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
              </div>
              <p className="text-sm text-gray-500 mb-4">{selectedResult.upload.original_filename}</p>

              {selectedResult.results.length === 0 ? (
                <p className="text-gray-400 text-sm">No results found.</p>
              ) : selectedResult.results.map(r => (
                <div key={r.id} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded p-3 text-center">
                      <div className="text-2xl font-bold text-gray-800">{selectedResult.upload.row_count_original ?? '—'}</div>
                      <div className="text-xs text-gray-500 mt-1">Original Rows</div>
                    </div>
                    <div className="bg-green-50 rounded p-3 text-center">
                      <div className="text-2xl font-bold text-green-700">{selectedResult.upload.row_count_cleaned ?? '—'}</div>
                      <div className="text-xs text-gray-500 mt-1">Cleaned Rows</div>
                    </div>
                    <div className="bg-yellow-50 rounded p-3 text-center">
                      <div className="text-2xl font-bold text-yellow-700">{r.duplicate_rows_count}</div>
                      <div className="text-xs text-gray-500 mt-1">Duplicate Rows</div>
                    </div>
                    <div className="bg-red-50 rounded p-3 text-center">
                      <div className="text-2xl font-bold text-red-700">{r.removed_rows_count}</div>
                      <div className="text-xs text-gray-500 mt-1">Removed Rows</div>
                    </div>
                  </div>

                  {r.cleaning_notes && (
                    <div className="bg-blue-50 rounded p-3 text-xs text-blue-800">{r.cleaning_notes}</div>
                  )}

                  {r.missing_values_summary && Object.keys(r.missing_values_summary).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Missing Values by Column</h4>
                      <div className="border rounded overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left">Column</th>
                              <th className="px-3 py-2 text-right">Missing Count</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {Object.entries(r.missing_values_summary).sort((a, b) => b[1] - a[1]).map(([col, cnt]) => (
                              <tr key={col}>
                                <td className="px-3 py-1.5 font-mono text-gray-700">{col}</td>
                                <td className="px-3 py-1.5 text-right text-red-600 font-medium">{cnt}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <a
                      href={`/api/proxy/data/uploads/${selectedResult.upload.id}/download-cleaned`}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium"
                    >
                      Download Cleaned CSV
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
