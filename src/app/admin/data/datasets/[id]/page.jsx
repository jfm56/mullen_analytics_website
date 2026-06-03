'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Database, Upload, RefreshCw, AlertTriangle, CheckCircle2,
  BarChart2, Plus, ExternalLink, ArrowLeft,
} from 'lucide-react';
import ErrorAlert from '@/components/ui/ErrorAlert';

const STATUS_COLORS = {
  CLEANED:  'bg-green-50 text-green-700 border-green-200',
  UPLOADED: 'bg-amber-50 text-amber-700 border-amber-200',
  CLEANING: 'bg-blue-50 text-blue-700 border-blue-200',
  FAILED:   'bg-red-50 text-red-700 border-red-200',
};

function MissingYearsAlert({ years }) {
  if (!years?.length) return null;
  return (
    <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
      <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-medium">Missing year{years.length > 1 ? 's' : ''}: {years.join(', ')}</p>
        <p className="text-xs text-amber-700 mt-0.5">
          Upload the missing EMSCharts CSV{years.length > 1 ? 's' : ''} for complete year-over-year comparison.
        </p>
      </div>
    </div>
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

export default function AdminDatasetDetailPage() {
  const router     = useRouter();
  const { id }     = useParams();
  const [authOk, setAuthOk]   = useState(false);
  const [group, setGroup]     = useState(null);
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // Assign upload modal
  const [assignModal, setAssignModal]   = useState(false);
  const [allUploads, setAllUploads]     = useState([]);
  const [assignForm, setAssignForm]     = useState({ upload_id: '', reporting_year: '' });
  const [assigning, setAssigning]       = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/proxy/datasets/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      setGroup(data);
      setUploads(data.uploads || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

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

  async function openAssignModal() {
    try {
      const res = await fetch(`/api/proxy/data/uploads?client_id=${group?.client_id}`, { credentials: 'include' });
      const data = res.ok ? await res.json() : [];
      setAllUploads(Array.isArray(data) ? data : []);
    } catch { setAllUploads([]); }
    setAssignModal(true);
  }

  async function handleAssign() {
    if (!assignForm.upload_id || !assignForm.reporting_year) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/proxy/datasets/${id}/assign-upload`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upload_id:      assignForm.upload_id,
          reporting_year: Number(assignForm.reporting_year),
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.detail || `Status ${res.status}`);
      }
      setAssignModal(false);
      setAssignForm({ upload_id: '', reporting_year: '' });
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setAssigning(false);
    }
  }

  if (!authOk || loading) return (
    <div className="flex items-center justify-center h-64 text-sm text-gray-400">
      <RefreshCw size={16} className="animate-spin mr-2" /> Loading dataset…
    </div>
  );

  const canCompare = (group?.cleaned_years?.length || 0) >= 2;

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-6 space-y-5">

      <div className="flex items-center gap-3 text-sm text-gray-500">
        <Link href="/admin/data/datasets" className="flex items-center gap-1 hover:text-gray-900">
          <ArrowLeft size={14} /> Datasets
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{group?.name}</span>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Database size={20} /> {group?.name}
          </h1>
          {group?.description && <p className="text-sm text-gray-500 mt-0.5">{group.description}</p>}
          <p className="text-xs text-gray-400 mt-1">Client: {group?.client_name}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canCompare && (
            <Link
              href={`/admin/dashboards/year-over-year/${id}`}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
            >
              <BarChart2 size={15} /> Year-over-Year Dashboard
            </Link>
          )}
          <button
            onClick={openAssignModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={15} /> Assign Upload to Group
          </button>
          <button onClick={load} className="p-2 border rounded-lg bg-white hover:bg-gray-50">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError('')} />

      <MissingYearsAlert years={group?.missing_years} />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Years Uploaded',  value: group?.uploaded_years?.length ?? 0 },
          { label: 'Years Cleaned',   value: group?.cleaned_years?.length ?? 0 },
          { label: 'Missing Years',   value: group?.missing_years?.length ?? 0, warn: true },
          { label: 'Total Uploads',   value: group?.upload_count ?? 0 },
        ].map(({ label, value, warn }) => (
          <div key={label} className="bg-white border rounded-xl p-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${warn && value > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Year coverage */}
      {(group?.uploaded_years?.length > 0 || group?.missing_years?.length > 0) && (
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">Year Coverage</p>
          <div className="flex flex-wrap gap-2">
            {(() => {
              const start = group.start_year || group.uploaded_years?.[0];
              const end   = group.end_year   || group.uploaded_years?.[group.uploaded_years.length - 1];
              if (!start || !end) return null;
              return Array.from({ length: end - start + 1 }, (_, i) => start + i).map(y => {
                const status = group.cleaned_years?.includes(y) ? 'cleaned'
                             : group.uploaded_years?.includes(y) ? 'uploaded'
                             : 'missing';
                return (
                  <div key={y} className={`flex flex-col items-center px-3 py-2 rounded-lg border text-xs font-medium ${
                    status === 'cleaned'  ? 'bg-green-50 text-green-700 border-green-200' :
                    status === 'uploaded' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-gray-50 text-gray-400 border-gray-200 border-dashed'
                  }`}>
                    <span>{y}</span>
                    <span className="text-[9px] mt-0.5 capitalize">{status}</span>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Uploads table */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Yearly Uploads</h2>
        </div>
        {uploads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 text-gray-400 text-sm gap-2">
            <Upload size={18} />
            No uploads assigned yet. Click "Assign Upload to Group" to add yearly data.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b">
                <tr className="text-left text-[10px] uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">Year</th>
                  <th className="px-4 py-3 font-medium">File</th>
                  <th className="px-4 py-3 font-medium">Rows</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Uploaded</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {uploads.sort((a, b) => (a.reporting_year || 0) - (b.reporting_year || 0)).map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-900">
                      {u.reporting_year || <span className="text-gray-400 italic font-normal">Unset</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{u.original_filename}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {u.row_count_cleaned?.toLocaleString() ?? u.row_count_original?.toLocaleString() ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_COLORS[u.upload_status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                        {u.upload_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 capitalize">{u.upload_type?.replace(/_/g, ' ') || '—'}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/data-explorer/${u.id}`}
                        className="flex items-center gap-1 text-blue-600 hover:underline justify-end"
                      >
                        Explore <ExternalLink size={10} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {canCompare && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-purple-900 flex items-center gap-2">
                <BarChart2 size={15} /> Ready for Year-over-Year Analysis
              </h3>
              <p className="text-xs text-purple-700 mt-1">
                {group?.cleaned_years?.length} years of cleaned data are available: {group?.cleaned_years?.join(', ')}.
              </p>
            </div>
            <Link
              href={`/admin/dashboards/year-over-year/${id}`}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors flex-shrink-0"
            >
              Open Dashboard <ExternalLink size={13} />
            </Link>
          </div>
        </div>
      )}

      {/* Assign upload modal */}
      {assignModal && (
        <Modal title="Assign Upload to Dataset Group" onClose={() => setAssignModal(false)}>
          <p className="text-xs text-gray-500 mb-4">
            Select an existing upload and specify which reporting year it represents.
          </p>
          <div className="space-y-3 mb-5">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Upload *</label>
              <select
                value={assignForm.upload_id}
                onChange={e => setAssignForm(p => ({ ...p, upload_id: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select an upload…</option>
                {allUploads.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.original_filename} ({u.upload_status}) — {u.created_at ? new Date(u.created_at).toLocaleDateString() : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Reporting Year *</label>
              <input
                type="number" min={2010} max={2030} placeholder="2024"
                value={assignForm.reporting_year}
                onChange={e => setAssignForm(p => ({ ...p, reporting_year: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setAssignModal(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={handleAssign} disabled={assigning || !assignForm.upload_id || !assignForm.reporting_year}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {assigning ? 'Assigning…' : 'Assign to Group'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
