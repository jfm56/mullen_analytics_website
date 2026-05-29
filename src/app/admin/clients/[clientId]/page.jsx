'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import PageTabs from '@/components/ui/PageTabs';
import StatusBadge from '@/components/ui/StatusBadge';
import MetricCard from '@/components/ui/MetricCard';
import ErrorAlert from '@/components/ui/ErrorAlert';
import PipelineStepper from '@/components/ui/PipelineStepper';
import { SkeletonCard, SkeletonTable } from '@/components/ui/LoadingSkeleton';

const TABS = [
  { id: 'overview',   label: 'Overview',       icon: '🏠' },
  { id: 'uploads',    label: 'Data Uploads',   icon: '📤' },
  { id: 'dashboard',  label: 'Dashboard',      icon: '📊' },
  { id: 'explorer',   label: 'Data Explorer',  icon: '🔍' },
  { id: 'messages',   label: 'Messages',       icon: '💬' },
];

async function apiFetch(path) {
  const res = await fetch(`/api/proxy${path}`, { credentials: 'include' });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || `HTTP ${res.status}`); }
  return res.json();
}

export default function ClientWorkspacePage() {
  const { clientId } = useParams();
  const router = useRouter();
  const [tab, setTab] = useState('overview');
  const [client, setClient] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [dashSummary, setDashSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cleaningId, setCleaningId] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const [c, u, d] = await Promise.allSettled([
          apiFetch(`/admin/clients/${clientId}`),
          apiFetch(`/admin/clients/${clientId}/uploads`),
          apiFetch(`/admin/clients/${clientId}/dashboard-summary`),
        ]);
        if (c.status === 'fulfilled') setClient(c.value);
        if (u.status === 'fulfilled') setUploads(u.value);
        if (d.status === 'fulfilled') setDashSummary(d.value);
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    };
    init();
  }, [clientId]);

  const handleClean = async (uploadId) => {
    setCleaningId(uploadId);
    try {
      await fetch(`/api/proxy/data/uploads/${uploadId}/clean`, { method: 'POST', credentials: 'include' });
      const fresh = await apiFetch(`/admin/clients/${clientId}/uploads`);
      setUploads(fresh);
    } catch (e) { setError(e.message); }
    finally { setCleaningId(null); }
  };

  if (loading) return (
    <div className="space-y-4">
      <SkeletonCard /><SkeletonCard />
    </div>
  );

  const pipelineSteps = (u) => [
    { label: 'Uploaded',    status: 'done' },
    { label: 'Cleaned',     status: u.upload_status === 'CLEANED' ? 'done' : u.upload_status === 'CLEANING' ? 'active' : u.upload_status === 'FAILED' ? 'error' : 'pending' },
    { label: 'Dashboard',   status: u.upload_status === 'CLEANED' ? 'done' : 'pending' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{client?.full_name || client?.company || 'Client Workspace'}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{client?.email} {client?.company && `· ${client.company}`}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link
              href={`/admin/data?client=${clientId}`}
              className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
            >
              Upload CSV
            </Link>
            {dashSummary?.has_dashboard && dashSummary.upload_id && (
              <Link
                href={`/admin/data-explorer/${dashSummary.upload_id}`}
                className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                📊 Open Dashboard
              </Link>
            )}
          </div>
        </div>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError('')} />

      <PageTabs tabs={TABS.map(t => ({
        ...t,
        count: t.id === 'uploads' ? uploads.length : undefined,
      }))} activeTab={tab} onChange={setTab} />

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard label="Total Uploads"   value={client?.upload_count ?? 0}   icon="📤" color="blue" />
            <MetricCard label="Status"          value={client?.client_status || '—'} icon="🏷️" color="gray" />
            <MetricCard label="Dashboard"       value={dashSummary?.has_dashboard ? 'Ready' : 'None'} icon="📊" color={dashSummary?.has_dashboard ? 'green' : 'gray'} />
            <MetricCard label="Last Upload"     value={client?.last_upload ? new Date(client.last_upload).toLocaleDateString() : '—'} icon="🕐" color="gray" />
          </div>

          {/* Latest upload pipeline */}
          {uploads[0] && (
            <div className="bg-white border rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Latest Upload Pipeline</h3>
              <p className="text-xs text-gray-500 mb-4 truncate">{uploads[0].original_filename}</p>
              <PipelineStepper steps={pipelineSteps(uploads[0])} />
              <div className="flex gap-2 mt-4 flex-wrap">
                {uploads[0].upload_status === 'CLEANED' && (
                  <>
                    <Link href={`/admin/dashboard?upload=${uploads[0].id}`} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700">📊 Dashboard</Link>
                    <Link href={`/admin/data-explorer/${uploads[0].id}`} className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-200">🔍 Explore</Link>
                  </>
                )}
                {(uploads[0].upload_status === 'UPLOADED' || uploads[0].upload_status === 'FAILED') && (
                  <button
                    onClick={() => handleClean(uploads[0].id)}
                    disabled={cleaningId === uploads[0].id}
                    className="text-xs bg-orange-100 text-orange-700 px-3 py-1.5 rounded-lg font-medium hover:bg-orange-200 disabled:opacity-50"
                  >
                    {cleaningId === uploads[0].id ? 'Processing…' : '⚙ Run Cleaning'}
                  </button>
                )}
              </div>
            </div>
          )}

          {client?.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <p className="font-medium mb-1">Notes</p>
              <p>{client.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Uploads Tab */}
      {tab === 'uploads' && (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">All Uploads ({uploads.length})</h3>
            <Link href={`/admin/data?client=${clientId}`} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700">
              + Upload CSV
            </Link>
          </div>
          {uploads.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">No uploads yet for this client.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['File', 'Status', 'Rows', 'Uploaded', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {uploads.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 truncate max-w-xs">{u.original_filename}</p>
                        <p className="text-xs text-gray-400">{u.file_size ? `${(u.file_size/1024).toFixed(0)} KB` : ''}</p>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={u.upload_status} type="upload" /></td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {u.row_count_original != null ? `${u.row_count_original} raw` : '—'}
                        {u.row_count_cleaned != null && ` → ${u.row_count_cleaned} clean`}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 flex-wrap">
                          {u.upload_status === 'CLEANED' && (
                            <>
                              <Link href={`/admin/dashboard?upload=${u.id}`} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">Dashboard</Link>
                              <Link href={`/admin/data-explorer/${u.id}`} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200">Explore</Link>
                            </>
                          )}
                          {(u.upload_status === 'UPLOADED' || u.upload_status === 'FAILED') && (
                            <button
                              onClick={() => handleClean(u.id)}
                              disabled={cleaningId === u.id}
                              className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded hover:bg-orange-200 disabled:opacity-50"
                            >
                              {cleaningId === u.id ? '…' : 'Clean'}
                            </button>
                          )}
                          <a href={`/api/proxy/data/uploads/${u.id}/download-original`} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200">↓ Original</a>
                          {u.upload_status === 'CLEANED' && (
                            <a href={`/api/proxy/data/uploads/${u.id}/download-cleaned`} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">↓ Cleaned</a>
                          )}
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

      {/* Dashboard Tab */}
      {tab === 'dashboard' && (
        <div>
          {dashSummary?.has_dashboard ? (
            <div className="bg-white border rounded-xl p-6 shadow-sm">
              <p className="text-sm text-gray-700 mb-4">Dashboard is ready for this client.</p>
              <Link
                href={`/admin/data-explorer/${dashSummary.upload_id}`}
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium"
              >
                Open Full Dashboard & Explorer
              </Link>
            </div>
          ) : (
            <div className="bg-white border rounded-xl p-10 text-center shadow-sm">
              <div className="text-4xl mb-3">📊</div>
              <p className="text-gray-700 font-medium mb-1">No dashboard ready yet</p>
              <p className="text-sm text-gray-500 mb-4">Upload and clean an EMSCharts CSV to generate analytics.</p>
              <Link href={`/admin/data?client=${clientId}`} className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                Upload CSV
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Explorer Tab */}
      {tab === 'explorer' && (
        <div>
          {dashSummary?.upload_id ? (
            <div className="bg-white border rounded-xl p-6 shadow-sm">
              <p className="text-sm text-gray-700 mb-4">Open the Data Explorer for the latest cleaned dataset.</p>
              <Link
                href={`/admin/data-explorer/${dashSummary.upload_id}`}
                className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium"
              >
                🔍 Open Data Explorer
              </Link>
            </div>
          ) : (
            <div className="bg-white border rounded-xl p-10 text-center shadow-sm">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-gray-700 font-medium mb-1">No cleaned data available</p>
              <p className="text-sm text-gray-500">Upload and clean a CSV first.</p>
            </div>
          )}
        </div>
      )}

      {/* Messages Tab */}
      {tab === 'messages' && (
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <p className="text-sm text-gray-500">Message thread for this client coming soon.</p>
        </div>
      )}
    </div>
  );
}
