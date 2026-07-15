'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fmtDate } from '@/lib/datetime';
import StatusBadge from '@/components/ui/StatusBadge';
import { SkeletonTable } from '@/components/ui/LoadingSkeleton';
import ErrorAlert from '@/components/ui/ErrorAlert';

export default function PortalDataExplorerIndexPage() {
  const router = useRouter();
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/proxy/data/uploads', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        const cleaned = (data || []).filter(u => u.upload_status === 'CLEANED');
        if (cleaned.length === 1) {
          router.replace(`/portal/data-explorer/${cleaned[0].id}`);
          return;
        }
        setUploads(data || []);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [router]);

  if (loading) return (
    <div className="space-y-4"><SkeletonTable rows={4} /></div>
  );

  const cleaned = uploads.filter(u => u.upload_status === 'CLEANED');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Data Explorer</h1>
        <p className="text-sm text-gray-500 mt-0.5">Select a cleaned dataset to explore</p>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError('')} />

      {cleaned.length === 0 ? (
        <div className="bg-white border rounded-xl p-12 text-center shadow-sm">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No cleaned data available</h2>
          <p className="text-sm text-gray-500 mb-6">Upload and process an EMSCharts CSV to explore your data.</p>
          <Link href="/portal/uploads" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium text-sm">
            Upload CSV
          </Link>
        </div>
      ) : (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['File', 'Status', 'Rows', 'Uploaded', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {uploads.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 truncate max-w-xs">{u.original_filename}</td>
                    <td className="px-4 py-3"><StatusBadge status={u.upload_status} type="upload" /></td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {u.row_count_cleaned != null ? `${u.row_count_cleaned} rows` : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {u.created_at ? fmtDate(u.created_at) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {u.upload_status === 'CLEANED' ? (
                        <Link
                          href={`/portal/data-explorer/${u.id}`}
                          className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-medium"
                        >
                          🔍 Explore
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-400">Not yet cleaned</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
