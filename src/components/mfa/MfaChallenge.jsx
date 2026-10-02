'use client';
import { useState } from 'react';
import { auth } from '@/lib/api';
import ErrorAlert from '@/components/ui/ErrorAlert';

/**
 * Two-factor verification for the current session. Accepts a 6-digit TOTP code
 * or a one-time recovery code. Calls onVerified() after the session is upgraded.
 */
export default function MfaChallenge({ onVerified, title = 'Two-factor verification', compact = false }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await auth.mfaVerify(code.trim());
      onVerified?.();
    } catch (err) {
      setError(err.message || 'Verification failed');
      setBusy(false);
    }
  }

  const inner = (
    <>
      <h2 className="text-base font-semibold text-gray-900 mb-1">{title}</h2>
      <p className="text-sm text-gray-500 mb-4">
        Enter the 6-digit code from your authenticator app. You can also use one of your recovery codes.
      </p>
      <ErrorAlert message={error} onDismiss={() => setError('')} />
      <form onSubmit={submit} className="space-y-3">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          placeholder="123456"
          className="w-full border rounded-lg px-3 py-2 text-lg tracking-widest text-center font-mono"
        />
        <button
          type="submit"
          disabled={busy || !code.trim()}
          className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-[var(--brand-primary)] hover:opacity-90 disabled:opacity-50"
        >
          {busy ? 'Verifying…' : 'Verify'}
        </button>
      </form>
    </>
  );

  if (compact) return inner;
  return <div className="max-w-sm mx-auto bg-white border rounded-xl shadow-sm p-6">{inner}</div>;
}
