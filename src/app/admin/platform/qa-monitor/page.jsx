'use client';
import { useEffect, useState, useCallback } from 'react';
import { platformAdmin } from '@/lib/api';

function Stat({ label, value, tone }) {
  return (
    <div className="bg-white border rounded-xl px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-gray-400">{label}</div>
      <div className={`text-xl font-bold ${tone || 'text-gray-900'}`}>{value ?? '—'}</div>
    </div>
  );
}
const pct = (v) => (v == null ? '—' : `${(v * 100).toFixed(1)}%`);

export default function QaMonitor() {
  const [cls, setCls] = useState('');
  const [status, setStatus] = useState('');
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => {
    platformAdmin.qaMonitor({ classification: cls, status }).then(setD).catch((e) => setErr(e.message));
  }, [cls, status]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-lg font-bold text-gray-900 mb-1">Platform QA Monitoring</h1>
      <p className="text-sm text-gray-500 mb-4">Cross-agency QA testing view. Filters apply server-side.</p>
      <div className="flex gap-2 mb-4 text-sm">
        <select value={cls} onChange={(e) => setCls(e.target.value)} className="border rounded px-2 py-1">
          <option value="">All classifications</option>
          <option value="production">Production</option>
          <option value="trial">Trial</option>
          <option value="synthetic">Synthetic</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded px-2 py-1">
          <option value="">All statuses</option>
          <option value="auto_generated">Auto-generated</option>
          <option value="pending_human">Pending human</option>
          <option value="approved">Approved</option>
        </select>
      </div>
      {err && <div className="text-rose-600 text-sm mb-3">{err}</div>}
      {!d ? <div className="text-gray-400 text-sm">Loading…</div> : !d.available ? (
        <div className="text-gray-400 text-sm">QA module not enabled in this environment.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <Stat label="Total reviews" value={d.total_reviews} />
            <Stat label="Pending" value={d.pending} tone="text-amber-600" />
            <Stat label="Override rate" value={pct(d.override_rate)} />
            <Stat label="AUTO vs HUMAN agreement" value={pct(d.auto_human_agreement)} tone="text-indigo-600" />
            <Stat label="Critical" value={d.findings.Critical} tone="text-rose-600" />
            <Stat label="Major" value={d.findings.Major} tone="text-amber-700" />
            <Stat label="Minor" value={d.findings.Minor} />
            <Stat label="Commendations" value={d.findings.Commendation} tone="text-emerald-600" />
            <Stat label="Severity agreement" value={pct(d.severity_agreement)} />
            <Stat label="Need human severity" value={d.findings_requiring_human_severity} tone="text-amber-600" />
          </div>
          <div className="bg-white border rounded-xl p-4">
            <div className="text-xs uppercase text-gray-400 mb-2">Most frequently failed CQIs</div>
            {(!d.most_failed_cqi || d.most_failed_cqi.length === 0) ? <div className="text-gray-400 text-sm">None.</div> : (
              <div className="flex flex-wrap gap-2">
                {d.most_failed_cqi.map((c) => (
                  <span key={c.indicator} className="text-xs px-2 py-1 rounded border bg-rose-50 text-rose-700 border-rose-200">CQI #{c.indicator}: {c.count}</span>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
