'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

const STATUS_COLORS = {
  PLANNING:  'bg-purple-100 text-purple-800',
  ACTIVE:    'bg-green-100 text-green-800',
  ON_HOLD:   'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-red-100 text-red-800',
  active:    'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  on_hold:   'bg-yellow-100 text-yellow-800',
  archived:  'bg-gray-100 text-gray-800',
};

const INV_STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  sent:    'bg-blue-100 text-blue-800',
  paid:    'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
};

export default function AdminProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [project, setProject]     = useState(null);
  const [client, setClient]       = useState(null);
  const [documents, setDocuments] = useState([]);
  const [invoices, setInvoices]   = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  // Upload state
  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Invoice form state
  const [showInvForm, setShowInvForm]   = useState(false);
  const [invSaving, setInvSaving]       = useState(false);
  const [invError, setInvError]         = useState('');
  const [invForm, setInvForm] = useState({
    number: '', description: '', amount_due: '', currency: 'USD',
    status: 'pending', invoice_date: '', due_date: '',
  });

  useEffect(() => { if (projectId) load(); }, [projectId]);
  useEffect(() => { if (project) loadTab(); }, [activeTab, project]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [projRes, sessRes] = await Promise.all([
        fetch(`/api/proxy/projects/${projectId}`, { credentials: 'include' }),
        fetch('/api/proxy/auth/session', { credentials: 'include' }),
      ]);
      if (!sessRes.ok) { router.replace('/portal/login'); return; }
      const sess = await sessRes.json();
      if (sess.profile?.role !== 'admin') { router.replace('/portal/login'); return; }

      if (!projRes.ok) throw new Error('Project not found');
      const proj = await projRes.json();
      setProject(proj);

      const clientRes = await fetch(`/api/proxy/profiles/${proj.client_id}`, { credentials: 'include' });
      if (clientRes.ok) setClient(await clientRes.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTab = async () => {
    if (activeTab === 'documents') {
      const res = await fetch(`/api/proxy/projects/${projectId}/documents`, { credentials: 'include' });
      if (res.ok) setDocuments(await res.json());
    } else if (activeTab === 'invoices') {
      const res = await fetch(`/api/proxy/projects/${projectId}/invoices`, { credentials: 'include' });
      if (res.ok) setInvoices(await res.json());
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !project) return;
    setUploading(true);
    setUploadError('');
    try {
      const fd = new FormData();
      fd.append('client_id', project.client_id);
      fd.append('title', file.name);
      fd.append('document_type', 'deliverable');
      fd.append('visibility', 'client_visible');
      fd.append('file', file);
      const res = await fetch('/api/proxy/documents/upload', {
        method: 'POST', credentials: 'include', body: fd,
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.detail || 'Upload failed');
      }
      e.target.value = '';
      await loadTab();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (!invForm.amount_due) { setInvError('Amount is required'); return; }
    setInvSaving(true);
    setInvError('');
    try {
      const res = await fetch('/api/proxy/invoices/', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: project.client_id,
          project_id: projectId,
          number: invForm.number || undefined,
          description: invForm.description || undefined,
          amount_due: Math.round(parseFloat(invForm.amount_due) * 100),
          currency: invForm.currency,
          status: invForm.status,
          invoice_date: invForm.invoice_date || null,
          due_date: invForm.due_date || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.detail || 'Failed to create invoice');
      }
      setShowInvForm(false);
      setInvForm({ number: '', description: '', amount_due: '', currency: 'USD', status: 'pending', invoice_date: '', due_date: '' });
      await loadTab();
    } catch (err) {
      setInvError(err.message);
    } finally {
      setInvSaving(false);
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—';
  const fmtMoney = (cents) => cents != null
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
    : '—';

  if (loading) return (
    <div className="max-w-5xl mx-auto py-16 px-4 text-center text-sm text-gray-500">Loading…</div>
  );

  if (!project) return (
    <div className="max-w-5xl mx-auto py-16 px-4 text-center text-sm text-red-600">{error || 'Project not found.'}</div>
  );

  const statusColor = STATUS_COLORS[project.status] || 'bg-gray-100 text-gray-800';
  const tabs = ['overview', 'documents', 'invoices'];

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Back link */}
      {client && (
        <Link
          href={`/admin/clients/${project.client_id}`}
          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4"
        >
          ← Back to {client.full_name || client.email}
        </Link>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
          {client && (
            <p className="text-sm text-gray-500 mt-1">
              Client: <Link href={`/admin/clients/${project.client_id}`} className="text-blue-600 hover:underline">
                {client.full_name || client.email}
              </Link>
              {client.company ? ` · ${client.company}` : ''}
            </p>
          )}
          {project.description && <p className="text-sm text-gray-600 mt-1">{project.description}</p>}
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor}`}>
          {project.status}
        </span>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex gap-4 text-xs">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`pb-2 px-1 border-b-2 capitalize ${
                activeTab === t
                  ? 'border-[var(--brand-primary)] text-[var(--brand-primary)] font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Overview ── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 gap-4">
          {[
            ['Status', project.status],
            ['Phase', project.phase || '—'],
            ['Start Date', fmtDate(project.start_date)],
            ['End Date', fmtDate(project.end_date || project.deadline)],
            ['Budget', project.budget_cents != null ? fmtMoney(project.budget_cents) : (project.contract_value ? `$${parseFloat(project.contract_value).toLocaleString()}` : '—')],
            ['Created', fmtDate(project.created_at)],
          ].map(([label, value]) => (
            <div key={label} className="bg-white border rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className="text-sm font-medium">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Documents ── */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Documents ({documents.length})</h2>
            <label className={`text-xs px-3 py-1.5 bg-[var(--brand-primary)] text-white rounded-md cursor-pointer hover:opacity-90 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
              {uploading ? 'Uploading…' : '+ Upload Document'}
              <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
          </div>
          {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
          {documents.length === 0 ? (
            <div className="border rounded-lg bg-white p-8 text-center text-sm text-gray-500">No documents yet.</div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="border rounded-lg bg-white p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{doc.title}</p>
                    <p className="text-xs text-gray-500">{doc.original_filename} · {fmtDate(doc.created_at)}</p>
                  </div>
                  <a
                    href={`/api/proxy/documents/${doc.id}/download`}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Invoices ── */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Invoices ({invoices.length})</h2>
            <button
              onClick={() => setShowInvForm((v) => !v)}
              className="text-xs px-3 py-1.5 bg-[var(--brand-primary)] text-white rounded-md hover:opacity-90"
            >
              {showInvForm ? 'Cancel' : '+ New Invoice'}
            </button>
          </div>

          {showInvForm && (
            <form onSubmit={handleCreateInvoice} className="border rounded-lg bg-white p-4 space-y-3">
              <h3 className="text-sm font-semibold">New Invoice</h3>
              {invError && <p className="text-xs text-red-600">{invError}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Invoice # (optional)</label>
                  <input className="w-full border rounded px-3 py-2 text-sm" value={invForm.number}
                    onChange={(e) => setInvForm({ ...invForm, number: e.target.value })} placeholder="INV-001" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Amount (USD) *</label>
                  <input type="number" step="0.01" className="w-full border rounded px-3 py-2 text-sm"
                    value={invForm.amount_due} onChange={(e) => setInvForm({ ...invForm, amount_due: e.target.value })} placeholder="0.00" required />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-600 mb-1">Description</label>
                  <input className="w-full border rounded px-3 py-2 text-sm" value={invForm.description}
                    onChange={(e) => setInvForm({ ...invForm, description: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Invoice Date</label>
                  <input type="date" className="w-full border rounded px-3 py-2 text-sm"
                    value={invForm.invoice_date} onChange={(e) => setInvForm({ ...invForm, invoice_date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Due Date</label>
                  <input type="date" className="w-full border rounded px-3 py-2 text-sm"
                    value={invForm.due_date} onChange={(e) => setInvForm({ ...invForm, due_date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Status</label>
                  <select className="w-full border rounded px-3 py-2 text-sm"
                    value={invForm.status} onChange={(e) => setInvForm({ ...invForm, status: e.target.value })}>
                    {['pending', 'sent', 'paid', 'overdue', 'cancelled'].map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowInvForm(false)}
                  className="text-xs px-3 py-1.5 border rounded-md hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={invSaving}
                  className="text-xs px-3 py-1.5 bg-[var(--brand-primary)] text-white rounded-md hover:opacity-90 disabled:opacity-50">
                  {invSaving ? 'Saving…' : 'Create Invoice'}
                </button>
              </div>
            </form>
          )}

          {invoices.length === 0 ? (
            <div className="border rounded-lg bg-white p-8 text-center text-sm text-gray-500">No invoices yet.</div>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => (
                <div key={inv.id} className="border rounded-lg bg-white p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{inv.number || `INV-${inv.id.slice(0, 8)}`}</p>
                    {inv.description && <p className="text-xs text-gray-500">{inv.description}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">Due: {fmtDate(inv.due_date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{fmtMoney(inv.amount_due)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${INV_STATUS_COLORS[inv.status] || 'bg-gray-100 text-gray-800'}`}>
                      {inv.status}
                    </span>
                    {inv.hosted_invoice_url && (
                      <a href={inv.hosted_invoice_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline">Pay Link</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
