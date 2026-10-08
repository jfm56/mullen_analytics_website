'use client';
import { useEffect, useState } from 'react';
import { platformAdmin } from '@/lib/api';

export default function PlatformAuditPage() {
  const [events, setEvents] = useState(null);
  useEffect(() => { platformAdmin.audit().then((d) => setEvents(d.events)).catch(() => setEvents([])); }, []);
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-lg font-bold text-gray-900 mb-1">Platform Admin Audit</h1>
      <p className="text-sm text-gray-500 mb-4">Every platform-admin action records the real actor — View-As never obscures it.</p>
      {!events ? <div className="text-gray-400 text-sm">Loading…</div> : (
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b"><tr><th className="px-3 py-2">When</th><th>Action</th><th>Scope</th><th>Selected agency</th><th>View-As</th><th>Actor</th></tr></thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-3 py-1.5 text-gray-500 whitespace-nowrap">{e.at ? new Date(e.at).toLocaleString() : '—'}</td>
                  <td className="px-3 py-1.5 font-medium text-gray-800">{e.action}</td>
                  <td className="px-3 py-1.5">{e.scope || '—'}</td>
                  <td className="px-3 py-1.5 text-xs text-gray-500">{e.selected_agency ? e.selected_agency.slice(0, 8) : '—'}</td>
                  <td className="px-3 py-1.5">{e.view_as ? <span className="text-amber-700 text-xs">{e.view_as_role || 'yes'}</span> : '—'}</td>
                  <td className="px-3 py-1.5 text-xs text-gray-500">{e.actor.slice(0, 8)}</td>
                </tr>
              ))}
              {events.length === 0 && <tr><td colSpan={6} className="px-3 py-5 text-center text-gray-400">No platform audit events.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
