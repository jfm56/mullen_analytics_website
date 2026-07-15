'use client';

import { fmtDate } from '@/lib/datetime';

export default function ClientPortalViewTab({
  client,
  projects,
  documents,
  invoices,
  onStartImpersonation,
}) {
  // Filter to only client-visible documents
  const visibleDocuments = documents.filter((d) => d.visibility === 'client_visible');
  const activeProjects = projects.filter((p) => p.status === 'active');
  const pendingInvoices = invoices.filter((i) => i.status === 'pending' || i.status === 'overdue');

  return (
    <div className="space-y-6">
      {/* Preview Header */}
      <div className="border rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Client Portal Preview</h2>
            <p className="text-sm text-gray-600 mt-1">
              This is a preview of what {client.full_name || client.email} sees when they log in.
            </p>
          </div>
          <button
            onClick={onStartImpersonation}
            className="px-4 py-2 bg-[var(--brand-primary)] text-white text-sm rounded-md hover:opacity-90"
          >
            Open Full Portal View
          </button>
        </div>
      </div>

      {/* Portal Preview Content */}
      <div className="border rounded-lg bg-white p-6">
        <div className="border-b pb-4 mb-6">
          <h3 className="text-xl font-bold">Welcome, {client.full_name || 'Client'}</h3>
          <p className="text-sm text-gray-600">{client.company || ''}</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="border rounded-lg p-4 bg-gray-50">
            <p className="text-xs text-gray-500 mb-1">Active Projects</p>
            <p className="text-2xl font-semibold">{activeProjects.length}</p>
          </div>
          <div className="border rounded-lg p-4 bg-gray-50">
            <p className="text-xs text-gray-500 mb-1">Documents</p>
            <p className="text-2xl font-semibold">{visibleDocuments.length}</p>
          </div>
          <div className="border rounded-lg p-4 bg-gray-50">
            <p className="text-xs text-gray-500 mb-1">Pending Invoices</p>
            <p className="text-2xl font-semibold">{pendingInvoices.length}</p>
          </div>
        </div>

        {/* Projects Preview */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold mb-3">Your Projects</h4>
          {activeProjects.length === 0 ? (
            <p className="text-xs text-gray-500">No active projects.</p>
          ) : (
            <div className="space-y-2">
              {activeProjects.slice(0, 3).map((project) => (
                <div key={project.id} className="border rounded p-3 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{project.name}</p>
                      <p className="text-xs text-gray-500">{project.phase}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                      {project.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Documents Preview */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold mb-3">Recent Documents</h4>
          {visibleDocuments.length === 0 ? (
            <p className="text-xs text-gray-500">No documents available.</p>
          ) : (
            <div className="space-y-2">
              {visibleDocuments.slice(0, 5).map((doc) => (
                <div key={doc.id} className="flex items-center justify-between border rounded p-3 bg-gray-50">
                  <div>
                    <p className="text-sm font-medium">{doc.title}</p>
                    <p className="text-xs text-gray-500">{doc.document_type}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {fmtDate(doc.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invoices Preview */}
        <div>
          <h4 className="text-sm font-semibold mb-3">Pending Invoices</h4>
          {pendingInvoices.length === 0 ? (
            <p className="text-xs text-gray-500">No pending invoices.</p>
          ) : (
            <div className="space-y-2">
              {pendingInvoices.slice(0, 3).map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between border rounded p-3 bg-gray-50">
                  <div>
                    <p className="text-sm font-medium">
                      Invoice #{invoice.number || '—'}
                    </p>
                    <p className="text-xs text-gray-500">{invoice.description || '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      ${((invoice.amount_due || 0) / 100).toLocaleString()}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      invoice.status === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {invoice.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Visibility Info */}
      <div className="border rounded-lg bg-yellow-50 p-4 text-xs">
        <div className="flex items-start gap-2">
          <span className="text-yellow-600">⚠️</span>
          <div>
            <p className="font-medium text-yellow-800">Visibility Note</p>
            <p className="text-yellow-700 mt-1">
              The client can only see documents marked as "Client Visible". 
              Documents marked as "Internal" or "Admin Only" are hidden from this view.
              Currently showing {visibleDocuments.length} of {documents.length} total documents.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
