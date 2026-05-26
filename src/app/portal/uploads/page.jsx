'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth, dataUploads } from '@/lib/api';
import EMSDashboard from '@/components/EMSDashboard';

const API_URL = '/api/proxy';

const STATUS_COLORS = {
  UPLOADED: 'bg-blue-100 text-blue-800',
  CLEANING: 'bg-yellow-100 text-yellow-800',
  CLEANED:  'bg-green-100 text-green-800',
  FAILED:   'bg-red-100 text-red-800',
};

export default function PortalUploadsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [cleaningId, setCleaningId] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [form, setForm] = useState({ notes: '', file: null });
  const [dashboard, setDashboard] = useState(null);  // { upload, metrics, generatedAt }
  const [dashboardLoading, setDashboardLoading] = useState(false);

  const loadUploads = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/data/uploads`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load uploads');
      setUploads(await res.json());
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const session = await auth.getSession();
        if (!session.authenticated) { router.replace('/portal/login'); return; }
        setUser(session.user);
        await loadUploads();
        try {
          const { count } = await fetch(`${API_URL}/messages/unread-count`, { credentials: 'include' }).then(r => r.json());
          setUnreadMessages(count || 0);
        } catch {}
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
    if (form.notes) fd.append('notes', form.notes);
    fd.append('source_system', 'EMSCHARTS');
    setUploading(true);
    try {
      const res = await fetch(`${API_URL}/data/uploads`, { method: 'POST', credentials: 'include', body: fd });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Upload failed'); }
      setSuccess('Upload successful!');
      setForm({ notes: '', file: null });
      document.getElementById('csv-file-input').value = '';
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
      const res = await fetch(`${API_URL}/data/uploads/${uploadId}/clean`, { method: 'POST', credentials: 'include' });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Cleaning failed'); }
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
      await fetch(`${API_URL}/data/uploads/${uploadId}`, { method: 'DELETE', credentials: 'include' });
      await loadUploads();
    } catch (e) { setError(e.message); }
  };

  const handleViewResults = async (upload) => {
    try {
      const res = await fetch(`${API_URL}/data/uploads/${upload.id}/cleaning-results`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load results');
      setSelectedResult({ upload, results: await res.json() });
    } catch (e) { setError(e.message); }
  };

  const handleViewDashboard = async (upload) => {
    setError('');
    setDashboardLoading(true);
    try {
      const data = await dataUploads.getDashboard(upload.id);
      setDashboard({ upload, metrics: data.metrics, generatedAt: data.generated_at });
      setTimeout(() => document.getElementById('ems-dashboard-panel')?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) { setError(e.message || 'Failed to load dashboard'); }
    finally { setDashboardLoading(false); }
  };

  if (loading) return <div className="max-w-md mx-auto py-16 px-4 text-center text-gray-600 text-sm">Loading…</div>;

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 safe-bottom-content">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Upload data</h1>
          <p className="text-gray-600 text-sm mt-1">
            Upload your EMSCharts CSV exports for cleaning and analysis.
          </p>
        </div>
      </div>

      <div className="mb-6 border-b border-gray-200 bg-[var(--brand-primary)]/5 rounded-t-md">
        <nav className="flex flex-wrap gap-4 text-xs px-4 pt-3 items-center">
          <a
            href="/portal"
            className="inline-flex items-center border-b-2 border-transparent pb-2 text-gray-600 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] px-3"
          >
            Home
          </a>
          <a
            href="/portal/uploads"
            className="inline-flex items-center rounded-t-md bg-[var(--brand-primary)] text-white px-3 pb-2 border-b-2 border-[var(--brand-primary)]"
          >
            Upload data
          </a>
          <a
            href="/portal/invoices"
            className="inline-flex items-center border-b-2 border-transparent pb-2 text-gray-600 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] px-3"
          >
            View &amp; pay invoices
          </a>
          <a
            href="/portal/reports"
            className="inline-flex items-center border-b-2 border-transparent pb-2 text-gray-600 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] px-3"
          >
            Dashboards &amp; deliverables
          </a>
          <a
            href="/portal/messages"
            className="ml-auto inline-flex items-center border-b-2 border-transparent pb-2 text-gray-600 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] px-3"
          >
            <span>Messages</span>
            {unreadMessages > 0 && (
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] w-4 h-4">
                {unreadMessages}
              </span>
            )}
          </a>
        </nav>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">{success}</div>}

      {/* Upload Form */}
      <div className="bg-white border rounded-lg p-6 mb-6 shadow-sm">
        <h2 className="text-base font-semibold mb-4">Upload EMSCharts CSV</h2>
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <input
              type="text"
              placeholder="e.g. Q1 2025 export"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CSV File *</label>
            <input
              id="csv-file-input"
              type="file"
              accept=".csv"
              onChange={e => setForm(f => ({ ...f, file: e.target.files[0] || null }))}
              className="w-full text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">Only .csv files · Max 100 MB · Source: EMSCharts</p>
          </div>
          <button
            type="submit"
            disabled={uploading}
            className="bg-[var(--brand-primary)] hover:opacity-90 disabled:opacity-50 text-white px-5 py-2 rounded text-sm font-medium"
          >
            {uploading ? 'Uploading…' : 'Upload CSV'}
          </button>
        </form>
      </div>

      {/* Uploads list */}
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">My Uploads ({uploads.length})</h2>
        </div>
        {uploads.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No uploads yet. Upload your first EMSCharts CSV above.</div>
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
                      <p className="text-xs text-gray-500 mt-0.5">{u.row_count_original} rows → {u.row_count_cleaned ?? '?'} cleaned</p>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_COLORS[u.upload_status] || 'bg-gray-100 text-gray-700'}`}>
                    {u.upload_status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <a href={`${API_URL}/data/uploads/${u.id}/download-original`} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded">
                    Download Original
                  </a>
                  {u.upload_status === 'CLEANED' && (
                    <>
                      <a href={`${API_URL}/data/uploads/${u.id}/download-cleaned`} className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded">
                        Download Cleaned
                      </a>
                      <button onClick={() => handleViewResults(u)} className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1 rounded">
                        View Summary
                      </button>
                      <button
                        onClick={() => handleViewDashboard(u)}
                        disabled={dashboardLoading}
                        className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded disabled:opacity-50 font-medium"
                      >
                        {dashboardLoading && dashboard?.upload?.id === u.id ? 'Loading…' : '📊 Dashboard'}
                      </button>
                      <a
                        href={`/portal/data-explorer/${u.id}`}
                        className="text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-1 rounded font-medium"
                      >
                        🔍 Explore
                      </a>
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
                  <button onClick={() => handleDelete(u.id)} className="text-xs bg-red-100 hover:bg-red-200 text-red-600 px-3 py-1 rounded">
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
                <button onClick={() => setSelectedResult(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
              </div>
              <p className="text-sm text-gray-500 mb-5 truncate">{selectedResult.upload.original_filename}</p>
              {selectedResult.results.length === 0 ? (
                <p className="text-sm text-gray-400">No cleaning results available.</p>
              ) : selectedResult.results.map(r => (
                <div key={r.id} className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Original Rows', value: selectedResult.upload.row_count_original ?? '—', cls: 'bg-gray-50' },
                      { label: 'Cleaned Rows',  value: selectedResult.upload.row_count_cleaned ?? '—',  cls: 'bg-green-50 text-green-700' },
                      { label: 'Duplicates',    value: r.duplicate_rows_count, cls: 'bg-yellow-50 text-yellow-700' },
                      { label: 'Empty Removed', value: r.removed_rows_count,   cls: 'bg-red-50 text-red-700' },
                    ].map(s => (
                      <div key={s.label} className={`${s.cls} rounded-lg p-3 text-center`}>
                        <div className="text-2xl font-bold">{s.value}</div>
                        <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {r.cleaning_notes && <div className="bg-blue-50 rounded p-3 text-xs text-blue-800">{r.cleaning_notes}</div>}
                  {r.missing_values_summary && Object.keys(r.missing_values_summary).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Missing Values by Column</h4>
                      <div className="border rounded overflow-hidden max-h-56 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50 sticky top-0"><tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">Column</th>
                            <th className="px-3 py-2 text-right font-medium text-gray-600">Missing</th>
                          </tr></thead>
                          <tbody className="divide-y">
                            {Object.entries(r.missing_values_summary).sort((a,b)=>b[1]-a[1]).map(([col,cnt]) => (
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
                    <a href={`${API_URL}/data/uploads/${selectedResult.upload.id}/download-cleaned`} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium">
                      Download Cleaned CSV
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Inline Dashboard Panel */}
      {dashboard && (
        <div id="ems-dashboard-panel" className="mt-6 bg-white border rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">📊 EMS Analytics Dashboard</h2>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{dashboard.upload.original_filename}</p>
            </div>
            <button
              onClick={() => setDashboard(null)}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >×</button>
          </div>
          <EMSDashboard
            metrics={dashboard.metrics}
            generatedAt={dashboard.generatedAt}
            uploadId={dashboard.upload?.id}
            onRefresh={() => handleViewDashboard(dashboard.upload)}
          />
        </div>
      )}
    </div>
  );
}
