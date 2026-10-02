'use client';
import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { auth } from '@/lib/api';
import MfaEnroll from '@/components/mfa/MfaEnroll';
import ErrorAlert from '@/components/ui/ErrorAlert';
import { SkeletonCard } from '@/components/ui/LoadingSkeleton';

export default function SecurityPage() {
  const [status, setStatus] = useState(null); // { enabled, passed, recovery_codes_remaining }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [pw, setPw] = useState('');
  const [code, setCode] = useState('');
  const [disabling, setDisabling] = useState(false);

  function load() {
    return auth.mfaStatus()
      .then((s) => { setStatus(s); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }
  useEffect(() => { load(); }, []);

  async function disable(e) {
    e.preventDefault();
    setDisabling(true);
    setError('');
    setNotice('');
    try {
      await auth.mfaDisable(pw, code.trim());
      setPw('');
      setCode('');
      setNotice('Two-factor authentication disabled.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDisabling(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Security</h1>
      <p className="text-sm text-gray-500 mb-6">Manage two-factor authentication for your account.</p>

      <ErrorAlert message={error} onDismiss={() => setError('')} />
      {notice && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700 mb-4">{notice}</div>
      )}

      {loading ? (
        <SkeletonCard />
      ) : enrolling ? (
        <MfaEnroll onDone={() => { setEnrolling(false); setNotice('Two-factor authentication enabled.'); load(); }} />
      ) : (
        <div className="bg-white border rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            {status?.enabled ? (
              <ShieldCheck className="text-green-600" size={22} />
            ) : (
              <ShieldAlert className="text-amber-500" size={22} />
            )}
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Two-factor authentication {status?.enabled ? 'is on' : 'is off'}
              </h2>
              <p className="text-xs text-gray-500">
                {status?.enabled
                  ? `Authenticator app · ${status.recovery_codes_remaining} recovery code${status.recovery_codes_remaining === 1 ? '' : 's'} left`
                  : 'Add a second step at sign-in using an authenticator app.'}
              </p>
            </div>
          </div>

          {!status?.enabled ? (
            <button
              type="button"
              onClick={() => { setError(''); setNotice(''); setEnrolling(true); }}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-[var(--brand-primary)] hover:opacity-90"
            >
              Enable two-factor authentication
            </button>
          ) : (
            <form onSubmit={disable} className="border-t pt-4 space-y-3">
              <p className="text-sm text-gray-600">To turn it off, confirm your password and a current code.</p>
              <p className="text-xs text-amber-600">
                If EMS QA is enabled for your account, you&apos;ll be asked to set up two-factor again next time you open it.
              </p>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Account password"
                autoComplete="current-password"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                placeholder="6-digit or recovery code"
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
              />
              <button
                type="submit"
                disabled={disabling || !pw || !code.trim()}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {disabling ? 'Disabling…' : 'Disable two-factor'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
