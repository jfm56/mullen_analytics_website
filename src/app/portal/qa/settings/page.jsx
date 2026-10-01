'use client';
import { useEffect, useState } from 'react';
import {
  useQaAgency, qaGet, qaSend, Badge, QaPageHeader, QaUnavailable, canRotateSftp,
} from '@/lib/qa';
import ErrorAlert from '@/components/ui/ErrorAlert';
import { SkeletonCard } from '@/components/ui/LoadingSkeleton';
import { fmtDateTime } from '@/lib/datetime';

function KV({ label, value, highlight }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm text-gray-900 ${highlight ? 'font-mono font-semibold select-all bg-amber-50 px-2 rounded' : ''}`}>{value}</span>
    </div>
  );
}

export default function QaSettingsPage() {
  const { agency, loading: agencyLoading, error: agencyError } = useQaAgency();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rotating, setRotating] = useState(false);
  const [justRotated, setJustRotated] = useState(null);

  async function load() {
    try {
      const s = await qaGet(`/agencies/${agency.id}/sftp/credentials`);
      setStatus(s);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!agency) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agency]);

  async function rotate() {
    const msg = status?.has_credentials
      ? 'Generate a new SFTP password? The current password will stop working immediately.'
      : 'Set up SFTP access for this agency?';
    if (!window.confirm(msg)) return;
    setRotating(true);
    setError('');
    try {
      const creds = await qaSend(`/agencies/${agency.id}/sftp/credentials/rotate`, { method: 'POST' });
      setJustRotated(creds);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setRotating(false);
    }
  }

  if (agencyLoading) return <div className="max-w-2xl space-y-4"><SkeletonCard /></div>;
  if (agencyError || !agency) return <QaUnavailable error={agencyError} />;

  const mayRotate = canRotateSftp(agency.role);

  return (
    <div className="max-w-2xl">
      <QaPageHeader title="QA Settings" subtitle="SFTP drop folder for automated chart delivery" agency={agency} />
      <ErrorAlert message={error} onDismiss={() => setError('')} />

      {justRotated && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
          <h3 className="text-sm font-semibold text-amber-900 mb-1">Your new SFTP password — copy it now</h3>
          <p className="text-xs text-amber-700 mb-3">This password is shown only once and is never stored. Save it in your secrets manager.</p>
          <div className="bg-white rounded-lg border border-amber-200 px-4 py-2">
            <KV label="Host" value={justRotated.host} />
            <KV label="Port" value={justRotated.port} />
            <KV label="Username" value={justRotated.username} />
            <KV label="Password" value={justRotated.password} highlight />
            <KV label="Drop path" value={justRotated.drop_path} />
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonCard />
      ) : (
        <div className="bg-white border rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">SFTP drop folder</h3>
            <Badge tone={status?.has_credentials ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}>
              {status?.has_credentials ? 'Active' : 'Not configured'}
            </Badge>
          </div>

          <div className="mb-4">
            <KV label="Host" value={status?.host || '—'} />
            <KV label="Port" value={status?.port ?? '—'} />
            <KV label="Username" value={status?.username || '— (rotate to provision)'} />
            <KV label="Drop path" value={status?.drop_path || '/'} />
            <KV label="Password" value="Not stored." />
            <KV label="Last rotated" value={status?.last_rotated_at ? fmtDateTime(status.last_rotated_at) : 'Never'} />
          </div>

          {mayRotate ? (
            <button
              type="button"
              disabled={rotating}
              onClick={rotate}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-[var(--brand-primary)] hover:opacity-90 disabled:opacity-50"
            >
              {rotating ? 'Generating…' : status?.has_credentials ? 'Rotate password' : 'Set up SFTP access'}
            </button>
          ) : (
            <p className="text-sm text-gray-500">Only an agency admin can set up or rotate SFTP credentials.</p>
          )}
        </div>
      )}

      <div className="bg-white border rounded-xl shadow-sm p-6 mt-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Setup instructions</h3>
        <ol className="text-sm text-gray-600 space-y-1.5 list-decimal list-inside">
          <li>Click <span className="font-medium">Set up SFTP access</span> (or Rotate password) and copy the one-time password.</li>
          <li>Point your ePCR export or SFTP client at the host/port above using that username and password.</li>
          <li>Drop de-identified CSV, NEMSIS XML, or PDF files into the drop path. They import automatically.</li>
          <li>Rotate the password any time it may have been exposed.</li>
        </ol>
      </div>
    </div>
  );
}
