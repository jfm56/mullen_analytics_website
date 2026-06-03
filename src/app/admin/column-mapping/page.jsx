'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import ErrorAlert from '@/components/ui/ErrorAlert';

const STANDARD_FIELDS = [
  'incident_number','dispatch_time','enroute_time','arrival_time','clear_time',
  'unit','incident_type','disposition','transport_destination','response_mode',
  'priority','municipality','zip_code','crew_member','patient_age_group',
  'transport_type','is_interfacility_transport',
];

async function apiFetch(path) {
  const res = await fetch(`/api/proxy${path}`, { credentials: 'include' });
  if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.detail||`HTTP ${res.status}`); }
  return res.json();
}

export default function ColumnMappingPage() {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [uploads, setUploads] = useState([]);
  const [selectedUpload, setSelectedUpload] = useState('');
  const [mapping, setMapping] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    apiFetch('/admin/clients').then(setClients).catch(e => setError(e.message));
  }, []);

  useEffect(() => {
    if (!selectedClient) { setUploads([]); setSelectedUpload(''); return; }
    apiFetch(`/admin/clients/${selectedClient}/uploads`).then(data => {
      setUploads(data.filter(u => u.upload_status === 'CLEANED' || u.upload_status === 'UPLOADED'));
    }).catch(e => setError(e.message));
  }, [selectedClient]);

  useEffect(() => {
    if (!selectedUpload) { setMapping([]); return; }
    apiFetch(`/data/uploads/${selectedUpload}/column-mapping`)
      .then(data => setMapping(data || []))
      .catch(() => setMapping([]));
  }, [selectedUpload]);

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      await fetch(`/api/proxy/data/uploads/${selectedUpload}/column-mapping`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapping),
      });
      setSuccess('Mapping saved.');
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Column Mapping</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Map EMSCharts CSV columns to standard analytics fields.
        </p>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError('')} />
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{success}</div>}

      <div className="bg-white border rounded-xl shadow-sm p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
            <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.full_name || c.email}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload / Dataset</label>
            <select value={selectedUpload} onChange={e => setSelectedUpload(e.target.value)}
              disabled={!selectedClient}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400">
              <option value="">Select upload…</option>
              {uploads.map(u => <option key={u.id} value={u.id}>{u.original_filename} ({u.upload_status})</option>)}
            </select>
          </div>
        </div>
        {selectedUpload && (
          <div className="mt-4 flex gap-2">
            <button onClick={async () => {
              try {
                const data = await apiFetch(`/data/uploads/${selectedUpload}/column-mapping/autodetect`);
                setMapping(data || []);
                setSuccess('Auto-detect complete — review and save.');
              } catch(e) { setError(e.message); }
            }} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm rounded-lg font-medium">
              Auto-Detect Mapping
            </button>
            <button onClick={handleSave} disabled={saving || mapping.length === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Mapping'}
            </button>
          </div>
        )}
      </div>

      {mapping.length > 0 && (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">Column Mappings ({mapping.length})</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">CSV Column</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Maps To</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {mapping.map((m, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs text-gray-700">{m.csv_column}</td>
                  <td className="px-4 py-2">
                    <select
                      value={m.standard_field || ''}
                      onChange={e => {
                        const next = [...mapping];
                        next[i] = { ...next[i], standard_field: e.target.value };
                        setMapping(next);
                      }}
                      className="border rounded px-2 py-1 text-xs"
                    >
                      <option value="">— unmapped —</option>
                      {STANDARD_FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      m.confidence === 'exact' ? 'bg-green-100 text-green-700' :
                      m.confidence === 'fuzzy' ? 'bg-amber-100 text-amber-700' :
                      m.confidence === 'manual' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {m.confidence || 'unmapped'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedUpload && mapping.length === 0 && (
        <div className="bg-white border rounded-xl p-10 text-center shadow-sm text-gray-400 text-sm">
          No mappings found. Click <strong>Auto-Detect Mapping</strong> to get started.
        </div>
      )}
    </div>
  );
}
