'use client';
import { useEffect, useState } from 'react';
import { platformAdmin } from '@/lib/api';

function Stat({ label, value, tone }) {
  return (
    <div className="bg-white border rounded-xl px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-gray-400">{label}</div>
      <div className={`text-2xl font-bold ${tone || 'text-gray-900'}`}>{value}</div>
    </div>
  );
}

export default function PlatformOverview() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { platformAdmin.overview().then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <div className="max-w-6xl mx-auto px-4 py-6 text-rose-600 text-sm">{err}</div>;
  if (!d) return <div className="max-w-6xl mx-auto px-4 py-6 text-gray-400 text-sm">Loading…</div>;
  const cls = d.agencies.by_classification || {};
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-lg font-bold text-gray-900 mb-1">Platform Overview</h1>
      <p className="text-sm text-gray-500 mb-5">Aggregate across all tenants. Counts and summaries only — no unnecessary PHI.</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Stat label="Agencies" value={d.agencies.total} />
        <Stat label="Users" value={d.users.total} />
        <Stat label="Super admins" value={d.users.super_admins} tone="text-indigo-600" />
        <Stat label="QA reviews" value={d.qa.reviews} />
        <Stat label="Pending QA" value={d.qa.pending} tone="text-amber-600" />
        <Stat label="Critical awaiting" value={d.qa.critical_open} tone="text-rose-600" />
        <Stat label="Major findings" value={d.qa.major} tone="text-amber-700" />
        <Stat label="Failed imports" value={d.imports.failed} tone={d.imports.failed ? 'text-rose-600' : 'text-gray-900'} />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs uppercase text-gray-400 mb-2">Agencies by data classification</div>
          <div className="flex gap-2 flex-wrap">
            {['production', 'trial', 'synthetic'].map((k) => (
              <span key={k} className={`text-xs px-2 py-1 rounded border ${k === 'production' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : k === 'trial' ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-violet-50 text-violet-700 border-violet-200'}`}>
                {k}: {cls[k] || 0}
              </span>
            ))}
          </div>
          <div className="text-[11px] text-gray-400 mt-2">Synthetic/trial are excluded from production client metrics.</div>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs uppercase text-gray-400 mb-2">Recent administrative activity</div>
          <ul className="text-sm text-gray-700 space-y-1">
            {(d.recent_admin_activity || []).slice(0, 6).map((e, i) => (
              <li key={i} className="flex justify-between"><span>{e.action}</span><span className="text-gray-400 text-xs">{e.at ? new Date(e.at).toLocaleString() : ''}</span></li>
            ))}
            {(!d.recent_admin_activity || d.recent_admin_activity.length === 0) && <li className="text-gray-400">No recent activity.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
