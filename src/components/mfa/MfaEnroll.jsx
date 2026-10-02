'use client';
import { useEffect, useRef, useState } from 'react';
import { auth } from '@/lib/api';
import ErrorAlert from '@/components/ui/ErrorAlert';

/**
 * TOTP enrollment flow: scan the QR (or enter the secret), confirm with a code,
 * then save the one-time recovery codes. Calls onDone() once the user confirms
 * they've saved their recovery codes.
 */
export default function MfaEnroll({ onDone, heading = 'Set up two-factor authentication', intro }) {
  const [enroll, setEnroll] = useState(null); // { secret, provisioning_uri, qr_svg }
  const [code, setCode] = useState('');
  const [recovery, setRecovery] = useState(null); // string[]
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // guard StrictMode double-invoke (one secret)
    started.current = true;
    auth.mfaEnroll().then(setEnroll).catch((e) => setError(e.message));
  }, []);

  async function activate(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await auth.mfaActivate(code.trim());
      setRecovery(r.recovery_codes);
    } catch (err) {
      setError(err.message || 'Could not verify that code');
    } finally {
      setBusy(false);
    }
  }

  // Step 2: show recovery codes exactly once.
  if (recovery) {
    return (
      <div className="max-w-md mx-auto bg-white border rounded-xl shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Save your recovery codes</h2>
        <p className="text-sm text-gray-500 mb-4">
          Store these somewhere safe. Each code works once if you lose access to your authenticator. They won&apos;t be shown again.
        </p>
        <div className="grid grid-cols-2 gap-2 bg-gray-50 border rounded-lg p-4 font-mono text-sm">
          {recovery.map((c) => <div key={c} className="select-all">{c}</div>)}
        </div>
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(recovery.join('\n')).catch(() => {})}
          className="mt-3 text-sm text-blue-600 hover:underline"
        >
          Copy all
        </button>
        <button
          type="button"
          onClick={() => onDone?.()}
          className="mt-4 w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-[var(--brand-primary)] hover:opacity-90"
        >
          I&apos;ve saved my recovery codes
        </button>
      </div>
    );
  }

  // Step 1: scan QR + confirm a code.
  return (
    <div className="max-w-md mx-auto bg-white border rounded-xl shadow-sm p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-1">{heading}</h2>
      <p className="text-sm text-gray-500 mb-4">
        {intro || 'Scan this QR code with an authenticator app (Google Authenticator, 1Password, Authy), then enter the 6-digit code to confirm.'}
      </p>
      <ErrorAlert message={error} onDismiss={() => setError('')} />
      {!enroll ? (
        <div className="h-48 flex items-center justify-center text-sm text-gray-400">Preparing…</div>
      ) : (
        <>
          <div className="flex justify-center mb-3">
            <img src={enroll.qr_svg} alt="Authenticator QR code" className="w-44 h-44 border rounded-lg bg-white" />
          </div>
          <p className="text-xs text-gray-500 text-center mb-4">
            Can&apos;t scan? Enter this key manually:
            <br />
            <span className="font-mono text-gray-800 select-all break-all">{enroll.secret}</span>
          </p>
          <form onSubmit={activate} className="space-y-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              className="w-full border rounded-lg px-3 py-2 text-lg tracking-widest text-center font-mono"
            />
            <button
              type="submit"
              disabled={busy || !code.trim()}
              className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-[var(--brand-primary)] hover:opacity-90 disabled:opacity-50"
            >
              {busy ? 'Confirming…' : 'Confirm & enable'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
