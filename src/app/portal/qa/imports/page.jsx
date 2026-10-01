'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useQaAgency, qaGet, qaUpload, Badge, IMPORT_TONE, QaPageHeader, QaUnavailable, canUpload,
} from '@/lib/qa';
import ErrorAlert from '@/components/ui/ErrorAlert';
import { SkeletonTable } from '@/components/ui/LoadingSkeleton';
import { fmtDateTime } from '@/lib/datetime';

const TRANSIENT = ['received', 'analyzing'];

function formatBytes(n) {
  if (n == null) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function QaImportsPage() {
  const { agency, loading: agencyLoading, error: agencyError } = useQaAgency();
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!agency) return;
    try {
      const data = await qaGet(`/agencies/${agency.id}/imports`);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [agency]);

  useEffect(() => { refresh(); }, [refresh]);

  // Poll while any import is still being sniffed/analyzed.
  useEffect(() => {
    if (!rows.some((r) => TRANSIENT.includes(r.status))) return undefined;
    const id = setInterval(refresh, 2000);
    return () => clearInterval(id);
  }, [rows, refresh]);

  async function onUpload(e) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const created = await qaUpload(`/agencies/${agency.id}/imports`, file);
      if (fileRef.current) fileRef.current.value = '';
      if (created?.id) router.push(`/portal/qa/imports/${created.id}`);
      else refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  if (agencyLoading) return <SkeletonTable rows={5} />;
  if (agencyError || !agency) return <QaUnavailable error={agencyError} />;

  const mayUpload = canUpload(agency.role);

  return (
    <div>
      <QaPageHeader title="Imports" subtitle="Upload charts and track processing" agency={agency} />
      <ErrorAlert message={error} onDismiss={() => setError('')} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white border rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Upload charts</h3>
          {mayUpload ? (
            <form onSubmit={onUpload} className="space-y-3">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xml,.pdf"
                className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <button
                type="submit"
                disabled={uploading}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-[var(--brand-primary)] hover:opacity-90 disabled:opacity-50"
              >
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
              <p className="text-xs text-gray-400">CSV, NEMSIS XML, or PDF · up to 50 MB · de-identified data only.</p>
            </form>
          ) : (
            <p className="text-sm text-gray-500">Your role can view imports but not upload. Contact an admin or QA reviewer to upload charts.</p>
          )}
        </div>

        <div className="bg-white border rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">How to upload charts</h3>
          <ol className="text-sm text-gray-600 space-y-1.5 list-decimal list-inside">
            <li>Export de-identified charts from your ePCR as CSV, NEMSIS XML, or PDF.</li>
            <li>Upload here, or drop files into your SFTP folder (see QA Settings).</li>
            <li>We detect the format and propose a field mapping.</li>
            <li>Confirm the mapping; charts are normalized and QA rules run automatically.</li>
          </ol>
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-sm font-semibold text-gray-900">Past imports</h3>
        </div>
        {loading ? (
          <div className="p-6"><SkeletonTable rows={4} /></div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">No imports yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Filename</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Source</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Rows</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Size</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/portal/qa/imports/${r.id}`)}
                  >
                    <td className="px-6 py-3">
                      <Link href={`/portal/qa/imports/${r.id}`} className="text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                        {r.filename}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-gray-600">{r.upload_source === 'sftp_drop' ? 'via SFTP' : 'manual'}</td>
                    <td className="px-6 py-3">
                      <Badge tone={IMPORT_TONE[r.status]}>{r.status}</Badge>
                      {r.error_message && <span className="ml-2 text-xs text-red-600">{r.error_message}</span>}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums">{r.row_count ?? '—'}</td>
                    <td className="px-6 py-3 text-right tabular-nums">{formatBytes(r.size_bytes)}</td>
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
