'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MetricCard from '@/components/ui/MetricCard';
import StatusBadge from '@/components/ui/StatusBadge';
import ErrorAlert from '@/components/ui/ErrorAlert';
import { SkeletonTable } from '@/components/ui/LoadingSkeleton';

async function apiFetch(path) {
  const res = await fetch(`/api/proxy${path}`, { credentials: 'include' });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || `HTTP ${res.status}`); }
  return res.json();
}

export default function AdminClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const q = search ? `?search=${encodeURIComponent(search)}` : '';
      const data = await apiFetch(`/admin/clients${q}`);
      setClients(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const total      = clients.length;
  const active     = clients.filter(c => c.client_status === 'active').length;
  const withUpload = clients.filter(c => c.upload_count > 0).length;
  const hasFailed  = clients.filter(c => c.has_failed).length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Clients</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage agencies, uploads, and dashboards</p>
        </div>
        <Link href="/admin/users?invite=1" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
          + Invite client →
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Clients"       value={total}      icon="🏢" color="blue" />
        <MetricCard label="Active"              value={active}     icon="✅" color="green" />
        <MetricCard label="With Uploads"        value={withUpload} icon="📤" color="purple" />
        <MetricCard label="Failed Uploads"      value={hasFailed}  icon="⚠️" color="red" />
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b flex flex-col sm:flex-row gap-3 sm:items-center">
          <input
            type="text"
            placeholder="Search by name, email, or agency…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-500">{clients.length} client{clients.length !== 1 ? 's' : ''}</span>
        </div>

        <ErrorAlert message={error} onDismiss={() => setError('')} />

        {loading ? (
          <div className="p-4"><SkeletonTable rows={6} /></div>
        ) : clients.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            {search ? 'No clients match your search.' : 'No clients yet — use “+ Invite client” above to add your first client.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Client / Agency', 'Email', 'Status', 'Uploads', 'Last Upload', 'Dashboard', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {clients.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{c.full_name || '—'}</p>
                      {c.company && <p className="text-xs text-gray-400">{c.company}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{c.email}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.client_status || 'prospect'} type="client" />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${c.has_failed ? 'text-red-600' : 'text-gray-900'}`}>
                        {c.upload_count}
                      </span>
                      {c.has_failed && <span className="ml-1 text-xs text-red-500">⚠ failed</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {c.last_upload ? new Date(c.last_upload).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {c.has_dashboard ? (
                        <span className="text-xs text-green-600 font-medium">● Ready</span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/admin/clients/${c.id}?tab=ems`}
                          className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded font-medium"
                        >
                          Workspace
                        </Link>
                        <Link
                          href={`/admin/data?client=${c.id}`}
                          className="text-xs border hover:bg-gray-50 text-gray-600 px-2.5 py-1 rounded"
                        >
                          Uploads
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
