'use client';
import { useState, useEffect } from 'react';
import ErrorAlert from '@/components/ui/ErrorAlert';
import { SkeletonTable } from '@/components/ui/LoadingSkeleton';
import { Users, Activity, ShieldAlert, LogIn, Clock, AlertTriangle } from 'lucide-react';

const fmtTime = (s) => (s ? new Date(s).toLocaleString() : '—');
const fmtDate = (s) => (s ? new Date(s).toLocaleDateString() : 'Never');

const EVENT_BADGE = {
  login: 'bg-green-100 text-green-700',
  login_failed: 'bg-red-100 text-red-700',
  logout: 'bg-gray-100 text-gray-600',
  password_reset: 'bg-amber-100 text-amber-700',
  role_changed: 'bg-purple-100 text-purple-700',
  account_created: 'bg-blue-100 text-blue-700',
};
const evClass = (t) =>
  EVENT_BADGE[t] || (t && t.startsWith('impersonation') ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600');
const label = (t) => (t || '').replace(/_/g, ' ');

function Kpi({ label, value, Icon, alert }) {
  return (
    <div className={`border rounded-xl p-4 ${alert ? 'border-red-300 bg-red-50' : 'bg-white'}`}>
      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1">{Icon && <Icon size={12} />} {label}</div>
      <div className={`text-2xl font-bold ${alert ? 'text-red-600' : 'text-gray-900'}`}>{value}</div>
    </div>
  );
}

export default function AdminMonitoringPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/proxy/admin/monitoring', { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Server error ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const k = data?.kpis || {};

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Monitoring</h2>
        <p className="text-sm text-gray-500 mt-0.5">User activity, audit trail, and auth / security events</p>
      </div>
      <ErrorAlert message={error} onDismiss={() => setError('')} />

      {loading ? (
        <div className="bg-white border rounded-xl p-4"><SkeletonTable /></div>
      ) : !data ? null : (
        <div className="space-y-6">
          {(data.alerts || []).map((a, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
              <span><strong>{a.title}.</strong> {a.message}</span>
            </div>
          ))}

          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <Kpi label="Total users" value={k.total_users ?? '—'} Icon={Users} />
            <Kpi label="Active (24h)" value={k.active_24h ?? '—'} Icon={Activity} />
            <Kpi label="Active (7d)" value={k.active_7d ?? '—'} Icon={Activity} />
            <Kpi label="Active sessions" value={k.active_sessions ?? '—'} Icon={Clock} />
            <Kpi label="Logins (24h)" value={k.logins_24h ?? '—'} Icon={LogIn} />
            <Kpi label="Failed (24h)" value={k.failed_24h ?? '—'} Icon={ShieldAlert} alert={(k.failed_24h || 0) >= 5} />
          </div>

          {/* User roster */}
          <section className="bg-white border rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b">
              <h3 className="text-sm font-semibold text-gray-900">Users ({(data.users || []).length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['User', 'Role', 'Company', 'Status', 'Last login', 'Sessions'].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data.users || []).map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <div className="font-medium text-gray-800">{u.full_name || '—'}</div>
                        <div className="text-xs text-gray-400">{u.email}</div>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{u.role}</span>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-600">{u.company || '—'}</td>
                      <td className="px-4 py-2 text-xs text-gray-600">{u.client_status || '—'}</td>
                      <td className="px-4 py-2 text-xs text-gray-500">{fmtDate(u.last_login)}</td>
                      <td className="px-4 py-2 text-xs">
                        {u.active_sessions > 0
                          ? <span className="text-green-600 font-medium">{u.active_sessions} active</span>
                          : <span className="text-gray-400">0</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Security events */}
            <section className="bg-white border rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b">
                <h3 className="text-sm font-semibold text-gray-900">Security events</h3>
                <p className="text-xs text-gray-500">Logins, failed attempts, role changes, impersonation</p>
              </div>
              <div className="max-h-96 overflow-y-auto divide-y">
                {(data.security_events || []).length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-sm">No security events.</div>
                ) : (data.security_events || []).map((e, i) => (
                  <div key={i} className="px-4 py-2.5 flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap ${evClass(e.type)}`}>{label(e.type)}</span>
                      <span className="text-gray-700 truncate">
                        {e.user || '—'}{e.target ? <span className="text-gray-400"> → {e.target}</span> : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 whitespace-nowrap text-[11px] text-gray-400">
                      {e.ip_address && <span className="font-mono">{e.ip_address}</span>}
                      <span>{fmtTime(e.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Recent activity */}
            <section className="bg-white border rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b">
                <h3 className="text-sm font-semibold text-gray-900">Recent activity</h3>
                <p className="text-xs text-gray-500">Full audit trail</p>
              </div>
              <div className="max-h-96 overflow-y-auto divide-y">
                {(data.recent_activity || []).length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-sm">No activity yet.</div>
                ) : (data.recent_activity || []).map((a) => (
                  <div key={a.id} className="px-4 py-2.5 flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap ${evClass(a.action)}`}>{label(a.action)}</span>
                      <span className="text-gray-700 truncate">
                        {a.user || '—'}{a.resource_type ? <span className="text-gray-400"> · {a.resource_type}</span> : ''}
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-400 whitespace-nowrap">{fmtTime(a.created_at)}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
