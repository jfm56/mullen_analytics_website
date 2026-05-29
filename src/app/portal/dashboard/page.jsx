'use client';
import { useState, useEffect } from 'react';
import { dataUploads } from '@/lib/api';
import EMSDashboard from '@/components/EMSDashboard';
import ErrorAlert from '@/components/ui/ErrorAlert';
import { SkeletonCard } from '@/components/ui/LoadingSkeleton';
import Link from 'next/link';

async function apiFetch(path) {
  const res = await fetch(`/api/proxy${path}`, { credentials: 'include' });
  if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.detail||`HTTP ${res.status}`); }
  return res.json();
}

export default function PortalDashboardPage() {
  const [uploads, setUploads] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dashLoading, setDashLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/data/uploads')
      .then(data => {
        const cleaned = (data || []).filter(u => u.upload_status === 'CLEANED');
        setUploads(cleaned);
        if (cleaned.length > 0) setSelectedId(cleaned[0].id);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setDashLoading(true);
    setDashboard(null);
    dataUploads.getDashboard(selectedId)
      .then(d => setDashboard(d))
      .catch(e => setError(e.message || 'Failed to load dashboard'))
      .finally(() => setDashLoading(false));
  }, [selectedId]);

  if (loading) return <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your EMS analytics overview</p>
        </div>
        {uploads.length > 1 && (
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {uploads.map(u => (
              <option key={u.id} value={u.id}>
                {u.original_filename} — {new Date(u.created_at).toLocaleDateString()}
              </option>
            ))}
          </select>
        )}
      </div>

      <ErrorAlert message={error} onDismiss={() => setError('')} />

      {uploads.length === 0 ? (
        <div className="bg-white border rounded-xl p-12 text-center shadow-sm">
          <div className="text-5xl mb-4">📊</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No dashboard is ready yet</h2>
          <p className="text-sm text-gray-500 mb-6">Upload and process an EMSCharts CSV to generate analytics.</p>
          <Link href="/portal/uploads" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium text-sm">
            Upload CSV
          </Link>
        </div>
      ) : dashLoading ? (
        <div className="space-y-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : dashboard ? (
        <div className="bg-white border rounded-xl shadow-sm p-6">
          <EMSDashboard
            metrics={dashboard.metrics}
            generatedAt={dashboard.generated_at}
            uploadId={selectedId}
            onRefresh={() => {
              setDashLoading(true);
              dataUploads.getDashboard(selectedId).then(setDashboard).finally(() => setDashLoading(false));
            }}
          />
          <div className="mt-4 pt-4 border-t flex justify-end">
            <Link href={`/portal/data-explorer/${selectedId}`} className="text-sm bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-4 py-2 rounded-lg font-medium">
              🔍 Explore Full Dataset
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
