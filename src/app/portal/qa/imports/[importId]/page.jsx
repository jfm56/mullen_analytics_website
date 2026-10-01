'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  useQaAgency, qaGet, qaSend, Badge, IMPORT_TONE, QaUnavailable, canUpload,
} from '@/lib/qa';
import ErrorAlert from '@/components/ui/ErrorAlert';
import { SkeletonCard } from '@/components/ui/LoadingSkeleton';
import { fmtDateTime } from '@/lib/datetime';

const CANONICAL_FIELDS = [
  'external_id', 'incident_datetime', 'unit', 'provider_id',
  'call_type', 'disposition', 'destination', 'narrative_text',
];
const CANONICAL_LABELS = {
  external_id: 'External run/incident ID',
  incident_datetime: 'Incident date/time',
  unit: 'Unit',
  provider_id: 'Primary provider',
  call_type: 'Call type / chief complaint',
  disposition: 'Disposition',
  destination: 'Destination / receiving facility',
  narrative_text: 'Narrative (free text)',
};
const TRANSIENT = ['received', 'analyzing', 'normalizing'];

const isNemsis = (pm) => pm && pm.format === 'nemsis';
const isPdf = (pm) => pm && pm.format === 'pdf';

export default function QaImportDetailPage() {
  const { importId } = useParams();
  const { agency, loading: agencyLoading, error: agencyError } = useQaAgency();
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [mapping, setMapping] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const seededRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!agency) return;
    try {
      const d = await qaGet(`/agencies/${agency.id}/imports/${importId}`);
      setDetail(d);
      // Seed the CSV mapping editor once from the auto-proposed mapping.
      if (!seededRef.current) {
        const pm = d.proposed_mapping;
        if (pm && !isNemsis(pm) && !isPdf(pm) && pm.proposed_mapping) {
          setMapping({ ...pm.proposed_mapping });
          seededRef.current = true;
        }
      }
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [agency, importId]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!detail || !TRANSIENT.includes(detail.status)) return undefined;
    const id = setInterval(refresh, 2000);
    return () => clearInterval(id);
  }, [detail, refresh]);

  async function handleConfirm() {
    const clean = Object.fromEntries(
      Object.entries(mapping).filter(([, v]) => typeof v === 'string' && v.length > 0),
    );
    setSubmitting(true);
    setError('');
    try {
      const updated = await qaSend(`/agencies/${agency.id}/imports/${importId}/confirm-mapping`, {
        body: { mapping: clean },
      });
      setDetail(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (agencyLoading) return <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>;
  if (agencyError || !agency) return <QaUnavailable error={agencyError} />;

  const pm = detail?.proposed_mapping ?? null;
  const nemsis = isNemsis(pm);
  const pdf = isPdf(pm);
  const headers = (!nemsis && !pdf && pm?.headers) || [];
  const sampleRows = (!nemsis && !pdf && pm?.sample_rows) || [];
  const mayConfirm = canUpload(agency.role);

  return (
    <div className="max-w-5xl">
      <Link href="/portal/qa/imports" className="text-sm text-blue-600 hover:underline">← Back to imports</Link>
      <div className="mt-3" />
      <ErrorAlert message={error} onDismiss={() => setError('')} />

      {!detail ? (
        <div className="space-y-4"><SkeletonCard /></div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white border rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{detail.filename}</h2>
                <p className="text-xs text-gray-400 mt-1">
                  Uploaded {fmtDateTime(detail.created_at, { seconds: false })}
                  {detail.upload_source === 'sftp_drop' && ' · via SFTP'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={IMPORT_TONE[detail.status]}>{detail.status}</Badge>
                {detail.error_message && <span className="text-xs text-red-600">{detail.error_message}</span>}
              </div>
            </div>
            <dl className="grid grid-cols-[10rem_1fr] gap-y-2 text-sm mt-4">
              <dt className="text-gray-400">Rows</dt><dd className="text-gray-900">{detail.row_count ?? '—'}</dd>
              <dt className="text-gray-400">Source format</dt><dd className="text-gray-900">{detail.source?.toUpperCase()}</dd>
              {detail.vendor_hint && (<><dt className="text-gray-400">Vendor</dt><dd className="text-gray-900">{detail.vendor_hint}</dd></>)}
              {detail.normalized_at && (<><dt className="text-gray-400">Normalized at</dt><dd className="text-gray-900">{fmtDateTime(detail.normalized_at)}</dd></>)}
            </dl>
          </div>

          {detail.status === 'proposed' && !nemsis && !pdf && (
            <div className="bg-white border rounded-xl shadow-sm p-6">
              <h3 className="text-base font-semibold text-gray-900">Confirm column mapping</h3>
              <p className="text-sm text-gray-500 mt-1 mb-4">We auto-detected the columns below. Adjust as needed, then confirm to start normalizing.</p>
              <div className="space-y-3">
                {CANONICAL_FIELDS.map((field) => (
                  <div key={field} className="grid grid-cols-1 sm:grid-cols-[14rem_1fr] gap-2 sm:items-center">
                    <label htmlFor={`map-${field}`} className="text-sm text-gray-600">{CANONICAL_LABELS[field]}</label>
                    <select
                      id={`map-${field}`}
                      value={mapping[field] ?? ''}
                      onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value || undefined }))}
                      disabled={!mayConfirm}
                      className="block w-full rounded-lg border px-3 py-2 text-sm bg-white disabled:bg-gray-100"
                    >
                      <option value="">— skip —</option>
                      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              {mayConfirm ? (
                <button type="button" onClick={handleConfirm} disabled={submitting} className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-[var(--brand-primary)] hover:opacity-90 disabled:opacity-50">
                  {submitting ? 'Submitting…' : 'Confirm mapping → Normalize'}
                </button>
              ) : (
                <p className="text-sm text-gray-500 mt-4">Your role cannot confirm mappings. Ask an admin or QA reviewer.</p>
              )}
            </div>
          )}

          {detail.status === 'proposed' && pdf && pm && (
            <div className="bg-white border rounded-xl shadow-sm p-6">
              <h3 className="text-base font-semibold text-gray-900">PDF — auto-extracted</h3>
              <p className="text-sm text-gray-500 mt-1 mb-4">
                {pm.page_count} page{pm.page_count === 1 ? '' : 's'}, {pm.text_chars?.toLocaleString()} characters. One PDF becomes one chart.
              </p>
              <dl className="grid grid-cols-[14rem_1fr] gap-y-1.5 text-sm">
                <dt className="text-gray-400">External run/incident ID</dt>
                <dd className="text-gray-900 font-mono text-xs">{pm.detected_external_id ?? <span className="text-gray-400">— not detected</span>}</dd>
                <dt className="text-gray-400">Incident date/time</dt>
                <dd className="text-gray-900 font-mono text-xs">{pm.detected_incident_datetime ?? <span className="text-gray-400">— not detected</span>}</dd>
              </dl>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mt-4 mb-1">Text preview</p>
              <pre className="bg-gray-50 border rounded p-3 text-xs text-gray-700 whitespace-pre-wrap max-h-48 overflow-auto">{pm.preview || '(no preview)'}</pre>
              {mayConfirm && (
                <button type="button" onClick={handleConfirm} disabled={submitting} className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-[var(--brand-primary)] hover:opacity-90 disabled:opacity-50">
                  {submitting ? 'Submitting…' : 'Confirm → Normalize 1 chart'}
                </button>
              )}
            </div>
          )}

          {detail.status === 'proposed' && nemsis && pm && (
            <div className="bg-white border rounded-xl shadow-sm p-6">
              <h3 className="text-base font-semibold text-gray-900">NEMSIS XML — auto-extracted</h3>
              <p className="text-sm text-gray-500 mt-1">
                {pm.nemsis_version ? `Detected NEMSIS ${pm.nemsis_version}.` : 'Detected NEMSIS XML.'}{' '}
                {pm.pcr_count} patient care report{pm.pcr_count === 1 ? '' : 's'}. Canonical fields are pulled from standardized paths — no manual mapping needed.
              </p>
              <p className="text-sm text-gray-500 mt-1 mb-4">
                Vendor: <span className="font-medium text-gray-900">{pm.vendor_label ?? detail.vendor_hint ?? 'Generic NEMSIS'}</span>
              </p>
              {pm.warnings && pm.warnings.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 mb-4">
                  <p className="text-sm font-medium text-amber-800">Accepted with {pm.warnings.length} warning{pm.warnings.length === 1 ? '' : 's'}</p>
                  <ul className="mt-2 list-disc pl-5 space-y-0.5 text-xs text-amber-800">
                    {pm.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}
              <dl className="grid grid-cols-[14rem_1fr] gap-y-1.5 text-sm">
                {CANONICAL_FIELDS.map((field) => {
                  const v = pm.sample_pcr?.[field];
                  return (
                    <div key={field} className="contents">
                      <dt className="text-gray-400">{CANONICAL_LABELS[field]}</dt>
                      <dd className="text-gray-900 font-mono text-xs truncate">{v || <span className="text-gray-400">— (not in first PCR)</span>}</dd>
                    </div>
                  );
                })}
              </dl>
              {mayConfirm && (
                <button type="button" onClick={handleConfirm} disabled={submitting} className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-[var(--brand-primary)] hover:opacity-90 disabled:opacity-50">
                  {submitting ? 'Submitting…' : `Confirm → Normalize ${pm.pcr_count} records`}
                </button>
              )}
            </div>
          )}

          {!nemsis && sampleRows.length > 0 && (
            <div className="bg-white border rounded-xl shadow-sm p-6 overflow-x-auto">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Sample rows ({sampleRows.length} of {detail.row_count ?? '?'})</h3>
              <table className="min-w-full text-xs">
                <thead className="text-left text-gray-400 border-b">
                  <tr>{headers.map((h) => <th key={h} className="py-2 pr-4 font-medium whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {sampleRows.map((row, idx) => (
                    <tr key={idx} className="border-b">
                      {row.map((cell, ci) => <td key={ci} className="py-2 pr-4 text-gray-700 whitespace-nowrap">{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
