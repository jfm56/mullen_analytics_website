'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  useQaAgency, qaGet, Badge, SEVERITY_TONE, STATUS_TONE, QaPageHeader, QaUnavailable,
} from '@/lib/qa';
import ErrorAlert from '@/components/ui/ErrorAlert';
import { SkeletonTable } from '@/components/ui/LoadingSkeleton';
import { fmtDateTime } from '@/lib/datetime';

const SEVERITIES = ['Critical', 'High', 'Moderate', 'Low'];
const FLAG_STATUSES = ['pending', 'approved', 'rejected', 'dismissed'];

export default function QaFindingsPage() {
  const { agency, loading: agencyLoading, error: agencyError } = useQaAgency();
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('pending');
  const [severity, setSeverity] = useState('');

  const refresh = useCallback(async () => {
    if (!agency) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (severity) params.set('severity', severity);
    const qs = params.toString() ? `?${params.toString()}` : '';
    try {
      const data = await qaGet(`/agencies/${agency.id}/flags${qs}`);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [agency, status, severity]);

  useEffect(() => { refresh(); }, [refresh]);

  if (agencyLoading) return <SkeletonTable rows={6} />;
  if (agencyError || !agency) return <QaUnavailable error={agencyError} />;

  return (
    <div>
      <QaPageHeader title="Findings" subtitle="Review queue of QA flags" agency={agency} />
      <ErrorAlert message={error} onDismiss={() => setError('')} />

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-900 mr-auto">Review queue</h3>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="text-sm border rounded-lg px-3 py-2 bg-white">
            <option value="">All statuses</option>
            {FLAG_STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
          </select>
          <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="text-sm border rounded-lg px-3 py-2 bg-white">
            <option value="">All severities</option>
            {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {loading ? (
          <div className="p-6"><SkeletonTable rows={5} /></div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">No findings match these filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Severity</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Title</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Chart</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/portal/qa/findings/${r.id}`)}
                  >
                    <td className="px-6 py-3"><Badge tone={SEVERITY_TONE[r.severity]}>{r.severity}</Badge></td>
                    <td className="px-6 py-3"><Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge></td>
                    <td className="px-6 py-3 text-gray-900 max-w-md">{r.title}</td>
                    <td className="px-6 py-3 text-gray-600">
                      {r.chart_external_id ? <span className="font-mono text-xs">{r.chart_external_id}</span> : '—'}
                      {r.chart_unit && <span className="text-xs text-gray-400"> · {r.chart_unit}</span>}
                      {r.chart_call_type && <span className="text-xs text-gray-400"> · {r.chart_call_type}</span>}
                    </td>
                    <td className="px-6 py-3 text-gray-600">{fmtDateTime(r.created_at, { seconds: false })}</td>
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
