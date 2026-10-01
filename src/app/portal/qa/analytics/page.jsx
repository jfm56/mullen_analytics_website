'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  useQaAgency, qaGet, qaDownload, BarRow, QaPageHeader, QaUnavailable,
} from '@/lib/qa';
import MetricCard from '@/components/ui/MetricCard';
import ErrorAlert from '@/components/ui/ErrorAlert';
import { SkeletonCard } from '@/components/ui/LoadingSkeleton';

function pct(n) {
  return n == null ? '—' : `${Math.round(n * 100)}%`;
}

function monthOptions() {
  const out = [];
  const now = new Date();
  for (let i = 0; i < 12; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    out.push({ value, label });
  }
  return out;
}

function DimTable({ title, rows }) {
  return (
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Charts</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Flags</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Approval</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Top category</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(rows || []).length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-6 text-center text-gray-400">No data.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.key} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-900">{r.key}</td>
                  <td className="px-6 py-3 text-right tabular-nums">{r.charts}</td>
                  <td className="px-6 py-3 text-right tabular-nums">{r.flags}</td>
                  <td className="px-6 py-3 text-right tabular-nums">{pct(r.approval_rate)}</td>
                  <td className="px-6 py-3 text-gray-600">{r.top_category || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function QaAnalyticsPage() {
  const { agency, loading: agencyLoading, error: agencyError } = useQaAgency();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [month, setMonth] = useState('');
  const [busy, setBusy] = useState('');
  const months = useMemo(monthOptions, []);

  useEffect(() => {
    if (!agency) return;
    qaGet(`/agencies/${agency.id}/analytics/summary?months=12`)
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [agency]);

  async function download(kind) {
    setBusy(kind);
    setError('');
    try {
      if (kind === 'pdf') {
        const q = month ? `?month=${month}` : '';
        await qaDownload(`/agencies/${agency.id}/analytics/report.pdf${q}`, `qa-report-${month || 'all-time'}.pdf`);
      } else {
        await qaDownload(`/agencies/${agency.id}/analytics/export.csv`, 'qa-analytics.csv');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  }

  if (agencyLoading) return <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>;
  if (agencyError || !agency) return <QaUnavailable error={agencyError} />;

  const monthlyMax = data ? Math.max(1, ...(data.monthly || []).map((m) => m.flags)) : 1;

  return (
    <div>
      <QaPageHeader
        title="QA Analytics"
        subtitle="Provider & unit performance, training signals, and exports"
        agency={agency}
        actions={
          <>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="text-sm border rounded-lg px-3 py-2 bg-white"
              title="Month applies to the PDF report export"
            >
              <option value="">All time</option>
              {months.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => download('pdf')}
              className="text-sm px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              {busy === 'pdf' ? 'Downloading…' : 'Download PDF'}
            </button>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => download('csv')}
              className="text-sm px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              {busy === 'csv' ? 'Downloading…' : 'Download CSV'}
            </button>
          </>
        }
      />
      <ErrorAlert message={error} onDismiss={() => setError('')} />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : !data ? null : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard label="Charts" value={data.charts_total} />
            <MetricCard label="Flags" value={data.flags_total} color="amber" />
            <MetricCard label="Approval rate" value={pct(data.approval_rate)} color="green" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DimTable title="By provider" rows={data.by_provider} />
            <DimTable title="By unit" rows={data.by_unit} />
          </div>

          <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="text-sm font-semibold text-gray-900">Training recommendations</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Who</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Charts</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Confirmed</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Issues/chart</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Focus</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data.training || []).length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-6 text-center text-gray-400">No training recommendations.</td></tr>
                  ) : (
                    data.training.map((t, i) => (
                      <tr key={`${t.dimension}-${t.key}-${i}`} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-gray-900">{t.key}</td>
                        <td className="px-6 py-3 text-gray-600 capitalize">{t.dimension}</td>
                        <td className="px-6 py-3 text-right tabular-nums">{t.charts}</td>
                        <td className="px-6 py-3 text-right tabular-nums">{t.approved}</td>
                        <td className="px-6 py-3 text-right tabular-nums">{t.confirmed_issue_rate.toFixed(2)}</td>
                        <td className="px-6 py-3 text-gray-600">{t.focus_category || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Flags by month</h3>
            {(data.monthly || []).length === 0 ? (
              <p className="text-sm text-gray-400">No monthly data.</p>
            ) : (
              <div className="space-y-3">
                {data.monthly.map((m) => (
                  <BarRow
                    key={m.month}
                    label={new Date(m.month).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                    value={m.flags}
                    max={monthlyMax}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
