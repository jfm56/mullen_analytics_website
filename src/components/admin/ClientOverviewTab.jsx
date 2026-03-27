'use client';

import { useState } from 'react';
import { users } from '@/lib/api';

export default function ClientOverviewTab({
  client,
  projects,
  documents,
  invoices,
  uploads,
  onClientUpdate,
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: client?.full_name || '',
    company: client?.company || '',
    client_status: client?.client_status || 'prospect',
    contract_value: client?.contract_value || 0,
    health_score: client?.health_score || 0,
    notes: client?.notes || '',
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await users.update(client.id, formData);
      setEditing(false);
      onClientUpdate?.();
    } catch (e) {
      console.error('Failed to save:', e);
    } finally {
      setSaving(false);
    }
  };

  // Calculate stats
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const totalContractValue = projects.reduce((sum, p) => sum + (parseFloat(p.contract_value) || 0), 0);
  const pendingInvoices = invoices.filter(i => i.status === 'pending').length;
  const totalOwed = invoices
    .filter(i => i.status === 'pending' || i.status === 'overdue')
    .reduce((sum, i) => sum + (i.amount_due || 0), 0) / 100;

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border rounded-lg bg-white p-4">
          <p className="text-[11px] text-gray-500 mb-1">Active Projects</p>
          <p className="text-2xl font-semibold text-gray-900">{activeProjects}</p>
        </div>
        <div className="border rounded-lg bg-white p-4">
          <p className="text-[11px] text-gray-500 mb-1">Total Contract Value</p>
          <p className="text-2xl font-semibold text-gray-900">
            ${totalContractValue.toLocaleString()}
          </p>
        </div>
        <div className="border rounded-lg bg-white p-4">
          <p className="text-[11px] text-gray-500 mb-1">Pending Invoices</p>
          <p className="text-2xl font-semibold text-gray-900">{pendingInvoices}</p>
        </div>
        <div className="border rounded-lg bg-white p-4">
          <p className="text-[11px] text-gray-500 mb-1">Amount Owed</p>
          <p className="text-2xl font-semibold text-gray-900">
            ${totalOwed.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Client Details */}
      <div className="border rounded-lg bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Client Details</h2>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-[var(--brand-primary)] hover:underline"
            >
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(false)}
                className="text-xs text-gray-500 hover:underline"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-xs text-[var(--brand-primary)] hover:underline disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>

        {!editing ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div>
              <p className="text-gray-500 mb-1">Name</p>
              <p className="font-medium">{client.full_name || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Company</p>
              <p className="font-medium">{client.company || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Email</p>
              <p className="font-medium">{client.email}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Status</p>
              <p className="font-medium capitalize">{client.client_status || 'prospect'}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Health Score</p>
              <p className="font-medium">{client.health_score || 0}/100</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Last Login</p>
              <p className="font-medium">
                {client.last_login
                  ? new Date(client.last_login).toLocaleDateString()
                  : 'Never'}
              </p>
            </div>
            {client.notes && (
              <div className="col-span-full">
                <p className="text-gray-500 mb-1">Notes</p>
                <p className="font-medium whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-gray-500 mb-1">Name</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full border rounded px-2 py-1.5"
              />
            </div>
            <div>
              <label className="block text-gray-500 mb-1">Company</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full border rounded px-2 py-1.5"
              />
            </div>
            <div>
              <label className="block text-gray-500 mb-1">Status</label>
              <select
                value={formData.client_status}
                onChange={(e) => setFormData({ ...formData, client_status: e.target.value })}
                className="w-full border rounded px-2 py-1.5"
              >
                <option value="prospect">Prospect</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="churned">Churned</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-500 mb-1">Health Score (0-100)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.health_score}
                onChange={(e) => setFormData({ ...formData, health_score: parseInt(e.target.value) || 0 })}
                className="w-full border rounded px-2 py-1.5"
              />
            </div>
            <div className="col-span-full">
              <label className="block text-gray-500 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full border rounded px-2 py-1.5"
              />
            </div>
          </div>
        )}
      </div>

      {/* Recent Projects */}
      <div className="border rounded-lg bg-white p-4">
        <h2 className="text-sm font-semibold mb-3">Recent Projects</h2>
        {projects.length === 0 ? (
          <p className="text-xs text-gray-500">No projects yet.</p>
        ) : (
          <div className="space-y-2">
            {projects.slice(0, 3).map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
              >
                <div>
                  <p className="font-medium">{project.name}</p>
                  <p className="text-gray-500">{project.phase} • {project.status}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">${parseFloat(project.contract_value || 0).toLocaleString()}</p>
                  {project.deadline && (
                    <p className="text-gray-500">
                      Due {new Date(project.deadline).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Documents */}
      <div className="border rounded-lg bg-white p-4">
        <h2 className="text-sm font-semibold mb-3">Recent Documents</h2>
        {documents.length === 0 ? (
          <p className="text-xs text-gray-500">No documents yet.</p>
        ) : (
          <div className="space-y-2">
            {documents.slice(0, 5).map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
              >
                <div>
                  <p className="font-medium">{doc.title}</p>
                  <p className="text-gray-500">
                    {doc.document_type} • {doc.visibility}
                  </p>
                </div>
                <p className="text-gray-500">
                  {new Date(doc.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Uploads */}
      <div className="border rounded-lg bg-white p-4">
        <h2 className="text-sm font-semibold mb-3">Recent Uploads</h2>
        {uploads.length === 0 ? (
          <p className="text-xs text-gray-500">No uploads yet.</p>
        ) : (
          <div className="space-y-2">
            {uploads.slice(0, 5).map((upload) => (
              <div
                key={upload.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
              >
                <div>
                  <p className="font-medium">{upload.original_filename}</p>
                  <p className="text-gray-500">{upload.status}</p>
                </div>
                <p className="text-gray-500">
                  {new Date(upload.uploaded_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
