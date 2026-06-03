'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Upload, BarChart2 } from 'lucide-react';
import ErrorAlert from '@/components/ui/ErrorAlert';
import { SkeletonTable } from '@/components/ui/LoadingSkeleton';

export default function AdminDataExplorerIndexPage() {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/proxy/data/uploads', { credentials: 'include' })
      .then(async r => {
        if (!r.ok) throw new Error(`Server error ${r.status}`);
        const d = await r.json();
        setUploads(Array.isArray(d) ? d : (d.uploads ?? []));
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = uploads.filter(u =>
    (u.original_filename || u.filename || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Search size={20} className="text-blue-600" /> Data Explorer
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Select an upload to explore its data</p>
        </div>
        <Link
          href="/admin/data"
          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          <Upload size={15} /> Manage Uploads
        </Link>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError('')} />

      <div className="mb-4">
        <input
          type="search"
          placeholder="Search uploads…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-sm px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4"><SkeletonTable /></div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            {uploads.length === 0 ? 'No uploads yet. Upload a CSV to get started.' : 'No uploads match your search.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['File', 'Client', 'Status', 'Uploaded', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 text-xs">
                    {u.original_filename || u.filename || u.id}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {u.client_id ? String(u.client_id).slice(0, 8) + '…' : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.status === 'cleaned' ? 'bg-green-100 text-green-700' :
                      u.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {u.status || 'unknown'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 flex items-center gap-3">
                    <Link
                      href={`/admin/data-explorer/${u.id}`}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <Search size={13} /> Explore
                    </Link>
                    {u.status === 'cleaned' && (
                      <Link
                        href={`/admin/dashboard?uploadId=${u.id}`}
                        className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium"
                      >
                        <BarChart2 size={13} /> Dashboard
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
