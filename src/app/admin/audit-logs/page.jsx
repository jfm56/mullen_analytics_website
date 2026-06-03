'use client';
import { useState, useEffect } from 'react';
import ErrorAlert from '@/components/ui/ErrorAlert';
import { SkeletonTable } from '@/components/ui/LoadingSkeleton';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/proxy/admin/audit-logs?limit=100', { credentials: 'include' })
      .then(async r => {
        if (!r.ok) throw new Error(`Server error ${r.status}`);
        const d = await r.json();
        setLogs(Array.isArray(d) ? d : []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Audit Logs</h2>
        <p className="text-sm text-gray-500 mt-0.5">Recent platform activity (last 100 entries)</p>
      </div>
      <ErrorAlert message={error} onDismiss={() => setError('')} />
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        {loading ? <div className="p-4"><SkeletonTable /></div> : logs.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">No audit logs yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Action','User','Agency','Details','Time'].map(h=>(
                  <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map(l => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-xs font-mono text-gray-800">{l.action}</td>
                  <td className="px-4 py-2 text-xs text-gray-600">{l.user_id ? String(l.user_id).slice(0,8)+'…' : '—'}</td>
                  <td className="px-4 py-2 text-xs text-gray-600">{l.agency_id ? String(l.agency_id).slice(0,8)+'…' : '—'}</td>
                  <td className="px-4 py-2 text-xs text-gray-500 max-w-xs truncate">
                    {l.details ? (typeof l.details === 'object' ? JSON.stringify(l.details) : l.details) : '—'}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-400">{l.created_at ? new Date(l.created_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
