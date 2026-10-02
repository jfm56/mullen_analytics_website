'use client';
import { useEffect, useState } from 'react';
import {
  useQaAgency, qaGet, qaSend, Badge, SEVERITY_TONE, QaPageHeader, QaUnavailable, canMarkCorrected,
} from '@/lib/qa';
import ErrorAlert from '@/components/ui/ErrorAlert';
import { SkeletonCard } from '@/components/ui/LoadingSkeleton';
import { fmtDateTime } from '@/lib/datetime';

export default function QaCorrectionsPage() {
  const { agency, loading: agencyLoading, error: agencyError } = useQaAgency();
  const [charts, setCharts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState({});
  const [submitting, setSubmitting] = useState('');

  useEffect(() => {
    if (!agency) return;
    setLoading(true);
    qaGet(`/agencies/${agency.id}/charts/returned-to-crew`)
      .then((d) => { setCharts(Array.isArray(d) ? d : []); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [agency]);

  async function markCorrected(chartId) {
    setSubmitting(chartId);
    setError('');
    try {
      await qaSend(`/agencies/${agency.id}/charts/${chartId}/mark-corrected`, {
        body: { correction_notes: notes[chartId] || undefined },
      });
      setCharts((cur) => cur.filter((c) => c.id !== chartId));
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting('');
    }
  }

  if (agencyLoading) return <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>;
  if (agencyError || !agency) return <QaUnavailable error={agencyError} />;

  const mayCorrect = canMarkCorrected(agency.role);

  return (
    <div>
      <QaPageHeader title="My Corrections" subtitle="Charts returned to the crew with approved findings to address" agency={agency} />
      <ErrorAlert message={error} onDismiss={() => setError('')} />

      <p className="text-sm text-gray-500 mb-4">
        Only <span className="font-medium">approved</span> findings are shown here. Pending or rejected flags are never surfaced crew-side.
      </p>

      {loading ? (
        <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>
      ) : charts.length === 0 ? (
        <div className="bg-white border rounded-xl shadow-sm p-10 text-center text-gray-400 text-sm">
          No charts waiting on a correction.
        </div>
      ) : (
        <div className="space-y-4">
          {charts.map((c) => (
            <div key={c.id} className="bg-white border rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-gray-900 font-mono">{c.external_id || c.id}</h3>
                  <span className="text-xs text-gray-500">{fmtDateTime(c.incident_datetime, { seconds: false })}</span>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-xs text-gray-600">
                  <span>Unit: <span className="text-gray-900">{c.unit || '—'}</span></span>
                  <span>Provider: <span className="text-gray-900">{c.provider_id || '—'}</span></span>
                  <span>Complaint: <span className="text-gray-900">{c.call_type || '—'}</span></span>
                  <span>Disposition: <span className="text-gray-900">{c.disposition || '—'}</span></span>
                </div>
              </div>

              <div className="px-6 py-4 space-y-3">
                {(c.approved_flags || []).map((f) => (
                  <div key={f.id} className="border-l-2 border-amber-300 pl-3">
                    <div className="flex items-center gap-2">
                      <Badge tone={SEVERITY_TONE[f.severity]}>{f.severity}</Badge>
                      <span className="text-sm font-medium text-gray-900">{f.title}</span>
                    </div>
                    {f.suggested_crew_comment && (
                      <p className="text-sm text-gray-600 mt-1">{f.suggested_crew_comment}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="px-6 py-4 border-t bg-gray-50">
                <label className="block text-xs font-medium text-gray-500 mb-1">Correction notes (optional)</label>
                <textarea
                  rows={2}
                  value={notes[c.id] || ''}
                  onChange={(e) => setNotes((n) => ({ ...n, [c.id]: e.target.value }))}
                  disabled={!mayCorrect}
                  className="w-full text-sm border rounded-lg px-3 py-2 bg-white disabled:bg-gray-100"
                  placeholder={mayCorrect ? 'Describe what you corrected…' : 'Your role cannot mark charts corrected.'}
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    disabled={!mayCorrect || submitting === c.id}
                    onClick={() => markCorrected(c.id)}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-[var(--brand-primary)] hover:opacity-90 disabled:opacity-50"
                  >
                    {submitting === c.id ? 'Submitting…' : 'Mark corrected'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
