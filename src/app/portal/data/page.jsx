'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';

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

export default function PortalDataPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [cleaningId, setCleaningId] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    project_id: '',
    notes: '',
    file: null,
  });

  const loadUploads = useCallback(async () => {
    try {
      const data = await apiFetch('/data/uploads');
      setUploads(data);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const s = await auth.getSession();
        if (!s.authenticated) { router.replace('/portal/login'); return; }
        setSession(s);

        // Load own projects for the project selector
        try {
          const myProjects = await apiFetch('/projects/my-projects');
          setProjects(myProjects || []);
        } catch { /* ignore if no projects */ }

        await loadUploads();
      } catch {
        router.replace('/portal/login');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router, loadUploads]);

  const handleUpload = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.file) { setError('Please select a CSV file.'); return; }

    const fd = new FormData();
    fd.append('file', form.file);
    if (form.project_id) fd.append('project_id', form.project_id);
    if (form.notes) fd.append('notes', form.notes);
    fd.append('source_system', 'EMSCHARTS');

    setUploading(true);
    try {
      const res = await fetch('/api/proxy/data/uploads', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.detail || 'Upload failed');
      }
      setSuccess('Upload successful!');
      setForm({ project_id: '', notes: '', file: null });
      // reset file input
      document.getElementById('portal-csv-input').value = '';
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
      const res = await fetch(`/api/proxy/data/uploads/${uploadId}/clean`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.detail || 'Cleaning failed');
      }
      setSuccess('Cleaning complete!');
      await loadUploads();
    } catch (e) {
      setError(e.message);
    } finally {
      setCleaningId(null);
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

  if (loading) return <div className="p-8 text-gray-500">Loading…</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Data Uploads</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload your EMSCharts CSV exports. We&apos;ll clean and prepare the data for analysis.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">{success}</div>
      )}

      {/* Upload Form */}
      <div className="bg-white border rounded-lg p-6 mb-6 shadow-sm">
        <h2 className="text-base font-semibold mb-4">Upload EMSCharts CSV</h2>
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {projects.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link to Project (optional)
                </label>
                <select
                  value={form.project_id}
                  onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="">No project</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Q1 2025 export"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CSV File *</label>
            <input
              id="portal-csv-input"
              type="file"
              accept=".csv"
              onChange={e => setForm(f => ({ ...f, file: e.target.files[0] || null }))}
              className="w-full text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              Only .csv files accepted. Maximum 100 MB. Source: EMSCharts.
            </p>
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded text-sm font-medium"
          >
            {uploading ? 'Uploading…' : 'Upload CSV'}
          </button>
        </form>
      </div>

      {/* Uploads List */}
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">My Uploads ({uploads.length})</h2>
        </div>

        {uploads.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            No uploads yet. Upload your first EMSCharts CSV above.
          </div>
        ) : (
          <div className="divide-y">
            {uploads.map(u => (
              <div key={u.id} className="p-4 hover:bg-gray-50">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{u.original_filename}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {(u.file_size / 1024).toFixed(1)} KB
                      {u.notes && ` · ${u.notes}`}
                      {u.created_at && ` · ${new Date(u.created_at).toLocaleDateString()}`}
                    </p>
                    {u.row_count_original != null && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {u.row_count_original} rows → {u.row_count_cleaned ?? '?'} cleaned
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={u.upload_status} type="upload" />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  <a
                    href={`/api/proxy/data/uploads/${u.id}/download-original`}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded"
                  >
                    Download Original
                  </a>

                  {u.upload_status === 'CLEANED' && (
                    <>
                      <a
                        href={`/api/proxy/data/uploads/${u.id}/download-cleaned`}
                        className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded"
                      >
                        Download Cleaned
                      </a>
                      <button
                        onClick={() => handleViewResults(u)}
                        className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1 rounded"
                      >
                        View Summary
                      </button>
                    </>
                  )}

                  {(u.upload_status === 'UPLOADED' || u.upload_status === 'FAILED') && (
                    <button
                      onClick={() => handleClean(u.id)}
                      disabled={cleaningId === u.id}
                      className="text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 px-3 py-1 rounded disabled:opacity-50"
                    >
                      {cleaningId === u.id ? 'Cleaning…' : 'Run Cleaning'}
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(u.id)}
                    className="text-xs bg-red-100 hover:bg-red-200 text-red-600 px-3 py-1 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cleaning Results Modal */}
      {selectedResult && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold">Cleaning Summary</h3>
                <button
                  onClick={() => setSelectedResult(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-5 truncate">{selectedResult.upload.original_filename}</p>

              {selectedResult.results.length === 0 ? (
                <p className="text-sm text-gray-400">No cleaning results available.</p>
              ) : selectedResult.results.map(r => (
                <div key={r.id} className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Original Rows', value: selectedResult.upload.row_count_original ?? '—', color: 'bg-gray-50' },
                      { label: 'Cleaned Rows', value: selectedResult.upload.row_count_cleaned ?? '—', color: 'bg-green-50 text-green-700' },
                      { label: 'Duplicates Found', value: r.duplicate_rows_count, color: 'bg-yellow-50 text-yellow-700' },
                      { label: 'Empty Rows Removed', value: r.removed_rows_count, color: 'bg-red-50 text-red-700' },
                    ].map(stat => (
                      <div key={stat.label} className={`${stat.color} rounded-lg p-3 text-center`}>
                        <div className={`text-2xl font-bold ${stat.color.includes('text') ? '' : 'text-gray-800'}`}>
                          {stat.value}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {r.cleaning_notes && (
                    <div className="bg-blue-50 rounded p-3 text-xs text-blue-800 leading-relaxed">
                      {r.cleaning_notes}
                    </div>
                  )}

                  {r.missing_values_summary && Object.keys(r.missing_values_summary).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Missing Values by Column
                      </h4>
                      <div className="border rounded overflow-hidden max-h-64 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium text-gray-600">Column</th>
                              <th className="px-3 py-2 text-right font-medium text-gray-600">Missing</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {Object.entries(r.missing_values_summary)
                              .sort((a, b) => b[1] - a[1])
                              .map(([col, cnt]) => (
                                <tr key={col} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 font-mono text-gray-700">{col}</td>
                                  <td className="px-3 py-2 text-right text-red-600 font-medium">{cnt}</td>
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
