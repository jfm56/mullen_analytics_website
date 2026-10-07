'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ClipboardList, ShieldCheck, Download, RefreshCw, FlaskConical, ChevronRight } from 'lucide-react';
import { emscsQa } from '@/lib/api';

const TIER_CLS = {
  'Exemplary': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Meets Standard': 'bg-sky-100 text-sky-700 border-sky-200',
  'Needs Improvement': 'bg-amber-100 text-amber-700 border-amber-200',
  'Focused Review': 'bg-rose-100 text-rose-700 border-rose-200',
};
const STATUS_CLS = {
  auto_generated: 'bg-slate-100 text-slate-600 border-slate-200',
  pending_human: 'bg-amber-100 text-amber-700 border-amber-200',
  approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

function Stat({ label, value, tone }) {
  return (
    <div className="bg-white border rounded-xl px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-gray-400">{label}</div>
      <div className={`text-2xl font-bold ${tone || 'text-gray-900'}`}>{value}</div>
    </div>
  );
}

export default function QaDashboardPage() {
  const [agencyId, setAgencyId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const health = await emscsQa.health();
      if (!health.enabled) { setError('EMSCS QA module is not enabled in this environment.'); return; }
      const seeded = await emscsQa.seedDemo();         // local-dev: ensure a synthetic demo agency + reviews
      setAgencyId(seeded.agency_id);
      const data = await emscsQa.sessions(seeded.agency_id);
      setSessions(data.sessions || []);
    } catch (e) {
      setError(e.message || 'Failed to load QA dashboard');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const approved = sessions.filter((s) => s.status === 'approved').length;
  const pending = sessions.filter((s) => s.status !== 'approved').length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-indigo-600" />
          <h1 className="text-xl font-bold text-gray-900">EMSCS QA Review</h1>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded border bg-violet-100 text-violet-700 border-violet-200">SYNTHETIC · NO PHI</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="inline-flex items-center gap-1 text-sm border rounded-lg px-3 py-1.5 hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          {agencyId && (
            <a href={emscsQa.exportUrl(agencyId)} className="inline-flex items-center gap-1 text-sm border rounded-lg px-3 py-1.5 hover:bg-gray-50">
              <Download className="w-4 h-4" /> Export workbook
            </a>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-5">Chart Log → Indicator Review → Findings → Crew Feedback. Automated results are proposals pending human approval.</p>

      {error && <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm px-4 py-3">{error}</div>}
      {loading ? <div className="text-gray-400 text-sm">Loading…</div> : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <Stat label="Charts in review" value={sessions.length} />
            <Stat label="Approved" value={approved} tone="text-emerald-600" />
            <Stat label="Pending human review" value={pending} tone="text-amber-600" />
            <Stat label="Workflow" value="v1" tone="text-indigo-600" />
          </div>

          <div className="bg-white border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b bg-gray-50">
              <ClipboardList className="w-4 h-4 text-gray-500" />
              <span className="font-semibold text-gray-800 text-sm">Chart Log</span>
            </div>
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500 border-b">
                <tr>
                  <th className="px-4 py-2 font-medium">Review</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Composite</th>
                  <th className="px-4 py-2 font-medium">Tier</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-900">{s.external_ref || s.id.slice(0, 8)}</td>
                    <td className="px-4 py-2">
                      <span className={`text-[11px] px-2 py-0.5 rounded border ${STATUS_CLS[s.status] || 'bg-gray-100 text-gray-600'}`}>{s.status.replace('_', ' ')}</span>
                    </td>
                    <td className="px-4 py-2 text-gray-700">{s.approved_composite != null ? Number(s.approved_composite).toFixed(1) : '—'}</td>
                    <td className="px-4 py-2">
                      {s.approved_tier
                        ? <span className={`text-[11px] px-2 py-0.5 rounded border ${TIER_CLS[s.approved_tier] || 'bg-gray-100'}`}>{s.approved_tier}</span>
                        : <span className="text-gray-400 text-xs">not scored</span>}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link href={`/admin/qa/review/${s.id}?agency=${agencyId}`} className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                        Open review <ChevronRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
                {sessions.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                    <FlaskConical className="w-5 h-5 mx-auto mb-1" /> No reviews yet.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
