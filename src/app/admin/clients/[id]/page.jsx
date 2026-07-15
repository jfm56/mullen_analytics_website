'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { auth, users, projects, documents, invoices, uploads, impersonation } from '@/lib/api';
import { fmtDateTime, fmtDate } from '@/lib/datetime';

// Tab Components
import ClientOverviewTab from '@/components/admin/ClientOverviewTab';
import ClientProjectsTab from '@/components/admin/ClientProjectsTab';
import ClientDocumentsTab from '@/components/admin/ClientDocumentsTab';
import ClientBillingTab from '@/components/admin/ClientBillingTab';
import ClientActivityTab from '@/components/admin/ClientActivityTab';
import ClientPortalViewTab from '@/components/admin/ClientPortalViewTab';
import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';
import PipelineStepper from '@/components/ui/PipelineStepper';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'projects', label: 'Projects' },
  { id: 'documents', label: 'Documents' },
  { id: 'billing', label: 'Billing' },
  { id: 'activity', label: 'Activity' },
  { id: 'portal', label: 'Portal View' },
  { id: 'ems', label: '📤 EMS Data' },
  { id: 'dashboard', label: '📊 Dashboard' },
];

export default function AdminClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  // State
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  
  // Client data
  const [client, setClient] = useState(null);
  const [clientProjects, setClientProjects] = useState([]);
  const [clientDocuments, setClientDocuments] = useState([]);
  const [clientInvoices, setClientInvoices] = useState([]);
  const [clientUploads, setClientUploads] = useState([]);
  const [dashSummary, setDashSummary] = useState(null);
  const [cleaningId, setCleaningId] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);

  // Load client data
  const loadClientData = async () => {
    try {
      setLoading(true);
      setError('');

      // Check session
      const session = await auth.getSession();
      if (!session.authenticated || session.profile?.role !== 'admin') {
        setAllowed(false);
        router.replace('/portal/login');
        return;
      }

      setAllowed(true);

      // Load client profile
      const clientProfile = await users.get(clientId);
      setClient(clientProfile);

      // Load projects
      try {
        const projectsData = await projects.listForClient(clientId);
        setClientProjects(projectsData || []);
      } catch (e) {
        console.error('Failed to load projects:', e);
        setClientProjects([]);
      }

      // Load documents
      try {
        const docsData = await documents.listForClient(clientId);
        setClientDocuments(docsData || []);
      } catch (e) {
        console.error('Failed to load documents:', e);
        setClientDocuments([]);
      }

      // Load invoices
      try {
        const invoicesData = await invoices.listForClient(clientId);
        setClientInvoices(invoicesData || []);
      } catch (e) {
        console.error('Failed to load invoices:', e);
        setClientInvoices([]);
      }

      // Load uploads
      try {
        const uploadsData = await uploads.listForClient(clientId);
        setClientUploads(uploadsData || []);
      } catch (e) {
        console.error('Failed to load uploads:', e);
        setClientUploads([]);
      }

      // Load EMS dashboard summary
      try {
        const ds = await fetch(`/api/proxy/admin/clients/${clientId}/dashboard-summary`, { credentials: 'include' }).then(r => r.ok ? r.json() : null);
        setDashSummary(ds);
      } catch (e) {
        console.error('Failed to load dashboard summary:', e);
      }

      // Load activity logs
      try {
        const logs = await impersonation.getClientLogs(clientId);
        setActivityLogs(logs || []);
      } catch (e) {
        console.error('Failed to load activity logs:', e);
        setActivityLogs([]);
      }

    } catch (e) {
      setError(e.message || 'Failed to load client data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      loadClientData();
    }
  }, [clientId]);

  // Refresh functions for child components
  const refreshProjects = async () => {
    try {
      const projectsData = await projects.listForClient(clientId);
      setClientProjects(projectsData || []);
    } catch (e) {
      console.error('Failed to refresh projects:', e);
    }
  };

  const refreshDocuments = async () => {
    try {
      const docsData = await documents.listForClient(clientId);
      setClientDocuments(docsData || []);
    } catch (e) {
      console.error('Failed to refresh documents:', e);
    }
  };

  const refreshInvoices = async () => {
    try {
      const invoicesData = await invoices.listForClient(clientId);
      setClientInvoices(invoicesData || []);
    } catch (e) {
      console.error('Failed to refresh invoices:', e);
    }
  };

  const refreshUploads = async () => {
    try {
      const uploadsData = await uploads.listForClient(clientId);
      setClientUploads(uploadsData || []);
    } catch (e) {
      console.error('Failed to refresh uploads:', e);
    }
  };

  const refreshActivity = async () => {
    try {
      const logs = await impersonation.getClientLogs(clientId);
      setActivityLogs(logs || []);
    } catch (e) {
      console.error('Failed to refresh activity:', e);
    }
  };

  // Handle impersonation
  const handleStartImpersonation = async () => {
    try {
      await impersonation.start(clientId);
      router.push('/portal');
    } catch (e) {
      setError(e.message || 'Failed to start impersonation');
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-16 px-4 text-center text-gray-600 text-sm">
        Loading client data...
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="max-w-6xl mx-auto py-16 px-4 text-center text-gray-600 text-sm">
        Not authorized.
      </div>
    );
  }

  if (!client) {
    return (
      <div className="max-w-6xl mx-auto py-16 px-4 text-center text-gray-600 text-sm">
        Client not found.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button
            onClick={() => router.push('/admin')}
            className="text-xs text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1"
          >
            ← Back to Admin
          </button>
          <h1 className="text-2xl font-bold tracking-tight">
            {client.full_name || client.email}
          </h1>
          <p className="text-gray-600 text-sm">
            {client.company || 'No company'} • {client.email}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleStartImpersonation}
            className="text-xs px-3 py-1.5 border rounded-md hover:bg-gray-50"
          >
            View as Client
          </button>
          <span className={`text-xs px-2 py-1 rounded-full ${
            client.client_status === 'active' ? 'bg-green-100 text-green-800' :
            client.client_status === 'prospect' ? 'bg-blue-100 text-blue-800' :
            client.client_status === 'churned' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {client.client_status || 'prospect'}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex gap-4 text-xs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`pb-2 px-1 border-b-2 ${
                activeTab === tab.id
                  ? 'border-[var(--brand-primary)] text-[var(--brand-primary)] font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.id === 'projects' && clientProjects.length > 0 && (
                <span className="ml-1 text-[10px] bg-gray-100 px-1.5 py-0.5 rounded-full">
                  {clientProjects.length}
                </span>
              )}
              {tab.id === 'documents' && clientDocuments.length > 0 && (
                <span className="ml-1 text-[10px] bg-gray-100 px-1.5 py-0.5 rounded-full">
                  {clientDocuments.length}
                </span>
              )}
              {tab.id === 'billing' && clientInvoices.length > 0 && (
                <span className="ml-1 text-[10px] bg-gray-100 px-1.5 py-0.5 rounded-full">
                  {clientInvoices.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <ClientOverviewTab
          client={client}
          projects={clientProjects}
          documents={clientDocuments}
          invoices={clientInvoices}
          uploads={clientUploads}
          onClientUpdate={loadClientData}
        />
      )}

      {activeTab === 'projects' && (
        <ClientProjectsTab
          clientId={clientId}
          projects={clientProjects}
          onRefresh={refreshProjects}
        />
      )}

      {activeTab === 'documents' && (
        <ClientDocumentsTab
          clientId={clientId}
          projects={clientProjects}
          documents={clientDocuments}
          onRefresh={refreshDocuments}
        />
      )}

      {activeTab === 'billing' && (
        <ClientBillingTab
          clientId={clientId}
          projects={clientProjects}
          invoices={clientInvoices}
          onRefresh={refreshInvoices}
        />
      )}

      {activeTab === 'activity' && (
        <ClientActivityTab
          clientId={clientId}
          uploads={clientUploads}
          activityLogs={activityLogs}
          onRefreshUploads={refreshUploads}
          onRefreshActivity={refreshActivity}
        />
      )}

      {activeTab === 'portal' && (
        <ClientPortalViewTab
          client={client}
          projects={clientProjects}
          documents={clientDocuments}
          invoices={clientInvoices}
          onStartImpersonation={handleStartImpersonation}
        />
      )}

      {activeTab === 'ems' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">EMS Data Uploads</h3>
            <Link href={`/admin/data?client=${clientId}`}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700">
              + Upload CSV
            </Link>
          </div>
          {clientUploads.length === 0 ? (
            <div className="bg-white border rounded-xl p-10 text-center text-gray-400 text-sm">
              No uploads yet.
              <Link href={`/admin/data?client=${clientId}`} className="block mt-2 text-blue-600 hover:underline">Upload first CSV →</Link>
            </div>
          ) : (
            <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>{['File','Status','Rows','Uploaded','Actions'].map(h=>(
                    <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y">
                  {clientUploads.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 truncate max-w-xs">{u.original_filename || u.stored_filename}</p>
                        {u.file_size ? <p className="text-xs text-gray-400">{(u.file_size/1024).toFixed(0)} KB</p> : null}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={u.upload_status} type="upload" /></td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {u.row_count_original != null ? `${u.row_count_original} raw` : '—'}
                        {u.row_count_cleaned != null && ` → ${u.row_count_cleaned} clean`}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {u.created_at ? fmtDate(u.created_at) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 flex-wrap">
                          {u.upload_status === 'CLEANED' && (
                            <>
                              <Link href={`/admin/data-explorer/${u.id}`} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200">🔍 Explore</Link>
                            </>
                          )}
                          {(u.upload_status === 'UPLOADED' || u.upload_status === 'FAILED') && (
                            <button
                              onClick={async () => {
                                setCleaningId(u.id);
                                try {
                                  await fetch(`/api/proxy/data/uploads/${u.id}/clean`, { method: 'POST', credentials: 'include' });
                                  await refreshUploads();
                                } catch(e) { console.error(e); }
                                finally { setCleaningId(null); }
                              }}
                              disabled={cleaningId === u.id}
                              className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded hover:bg-orange-200 disabled:opacity-50"
                            >{cleaningId === u.id ? '…' : '⚙ Clean'}</button>
                          )}
                          <a href={`/api/proxy/data/uploads/${u.id}/download-original`} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200">↓ CSV</a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'dashboard' && (
        <div>
          {dashSummary?.has_dashboard ? (
            <div className="bg-white border rounded-xl p-6 shadow-sm space-y-3">
              <p className="text-sm text-gray-700">Dashboard ready — latest cleaned upload.</p>
              <div className="flex gap-2">
                <Link href={`/admin/data-explorer/${dashSummary.upload_id}`}
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium">
                  📊 Open Dashboard & Explorer
                </Link>
              </div>
              {dashSummary.generated_at && (
                <p className="text-xs text-gray-400">Generated {fmtDateTime(dashSummary.generated_at)}</p>
              )}
            </div>
          ) : (
            <div className="bg-white border rounded-xl p-10 text-center shadow-sm">
              <div className="text-4xl mb-3">📊</div>
              <p className="text-gray-700 font-medium mb-1">No dashboard ready</p>
              <p className="text-sm text-gray-500 mb-4">Upload and clean an EMSCharts CSV to generate analytics.</p>
              <Link href={`/admin/data?client=${clientId}`}
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                Upload CSV
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
