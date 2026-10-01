'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  useQaAgency, qaGet, BarRow, QaPageHeader, QaUnavailable,
} from '@/lib/qa';
import MetricCard from '@/components/ui/MetricCard';
import ErrorAlert from '@/components/ui/ErrorAlert';
import { SkeletonCard } from '@/components/ui/LoadingSkeleton';

const SEVERITY_ORDER = ['Critical', 'High', 'Moderate', 'Low'];
const SEVERITY_BAR = {
  Critical: 'bg-red-500',
  High: 'bg-orange-500',
  Moderate: 'bg-amber-500',
  Low: 'bg-gray-400',
};

function pct(n) {
  return `${Math.round((n || 0) * 100)}%`;
}

export default function QaDashboardPage() {
  const { agency, loading: agencyLoading, error: agencyError } = useQaAgency();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!agency) return;
    qaGet(`/agencies/${agency.id}/dashboard/qa-supervisor`)
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [agency]);

  if (agencyLoading) {
    return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>;
  }
  if (agencyError || !agency) return <QaUnavailable error={agencyError} />;

  const sevMax = data ? Math.max(1, ...SEVERITY_ORDER.map((s) => data.by_severity?.[s] || 0)) : 1;
  const catMax = data ? Math.max(1, ...(data.by_category || []).map((c) => c.count)) : 1;
  const ruleMax = data ? Math.max(1, ...(data.by_rule || []).map((r) => r.count)) : 1;
  const actMax = data ? Math.max(1, ...(data.activity_timeline || []).map((a) => a.count)) : 1;

  return (
    <div>
      <QaPageHeader title="QA Dashboard" subtitle="Supervisor overview of reviewed charts and findings" agency={agency} />
      <ErrorAlert message={error} onDismiss={() => setError('')} />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : !data || data.charts_total === 0 ? (
        <div className="bg-white border rounded-xl shadow-sm p-8 text-center">
          <h2 className="text-base font-semibold text-gray-900 mb-1">No charts reviewed yet</h2>
          <p className="text-sm text-gray-500 mb-4">Upload charts to start generating QA findings.</p>
          <Link href="/portal/qa/imports" className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-[var(--brand-primary)] hover:opacity-90">
            Go to Imports
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Charts reviewed" value={data.charts_total} />
            <MetricCard label="Flags generated" value={data.flags_total} sub={`${data.flags_pending} pending`} color="amber" />
            <MetricCard
              label="Approval rate"
              value={data.flags_approved + data.flags_rejected > 0 ? pct(data.approval_rate) : '—'}
              sub={`${data.flags_approved} approved · ${data.flags_rejected} rejected`}
              color="green"
            />
            <MetricCard label="Flags per chart" value={(data.flags_per_chart ?? 0).toFixed(1)} color="purple" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border rounded-xl shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Severity breakdown</h3>
              <div className="space-y-3">
                {SEVERITY_ORDER.map((s) => (
                  <BarRow key={s} label={s} value={data.by_severity?.[s] || 0} max={sevMax} tone={SEVERITY_BAR[s]} />
                ))}
              </div>
            </div>

            <div className="bg-white border rounded-xl shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Activity (last 14 days)</h3>
              {(data.activity_timeline || []).length === 0 ? (
                <p className="text-sm text-gray-400">No recent activity.</p>
              ) : (
                <div className="flex items-end gap-1 h-28">
                  {data.activity_timeline.map((a) => (
                    <div key={a.day} className="flex-1 flex flex-col items-center justify-end" title={`${a.day}: ${a.count}`}>
                      <div className="w-full bg-blue-500 rounded-t" style={{ height: `${Math.max(4, (a.count / actMax) * 100)}%` }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border rounded-xl shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Top flag categories</h3>
              {(data.by_category || []).length === 0 ? (
                <p className="text-sm text-gray-400">No categories yet.</p>
              ) : (
                <div className="space-y-3">
                  {data.by_category.map((c) => (
                    <BarRow key={c.category} label={c.category} value={c.count} max={catMax} />
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border rounded-xl shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Top rules firing</h3>
              {(data.by_rule || []).length === 0 ? (
                <p className="text-sm text-gray-400">No rules fired yet.</p>
              ) : (
                <div className="space-y-3">
                  {data.by_rule.map((r) => (
                    <BarRow key={r.rule_id} label={r.title} value={r.count} max={ruleMax} tone="bg-indigo-500" />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="text-sm font-semibold text-gray-900">Rule effectiveness &amp; learned weights</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Rule</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Approved</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Rejected</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Acceptance</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Weight</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data.rule_effectiveness || []).length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-6 text-center text-gray-400">No decisions recorded yet.</td></tr>
                  ) : (
                    data.rule_effectiveness.map((r) => (
                      <tr key={r.rule_id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-gray-900">{r.title}</td>
                        <td className="px-6 py-3 text-right tabular-nums">{r.approved}</td>
                        <td className="px-6 py-3 text-right tabular-nums">{r.rejected}</td>
                        <td className="px-6 py-3 text-right tabular-nums">{pct(r.acceptance_rate)}</td>
                        <td className="px-6 py-3 text-right tabular-nums">
                          <span className={r.weight < 1 ? 'text-amber-600 font-medium' : 'text-gray-700'}>
                            {r.weight.toFixed(2)}×
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
