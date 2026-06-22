'use client';

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/api';

function VerifyEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);

  // status: 'verifying' | 'success' | 'error'
  const [status, setStatus] = useState(token ? 'verifying' : 'error');
  const [message, setMessage] = useState(
    token ? '' : 'Invalid or missing verification link. Please use the link from your email.'
  );
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true; // guard against React strict-mode double-invoke

    auth
      .verifyEmail(token)
      .then((res) => {
        setStatus('success');
        setMessage(res?.message || 'Your email has been verified.');
        // The signup flow auto-logs the user in, so send them into the portal.
        setTimeout(() => router.replace('/portal/dashboard'), 2500);
      })
      .catch((e) => {
        setStatus('error');
        setMessage(
          e?.message ||
            'This verification link is invalid or has expired. Please request a new one.'
        );
      });
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Email verification</h2>
        </div>

        {status === 'verifying' && (
          <div className="rounded-md bg-white border border-gray-200 p-6 shadow-sm">
            <p className="text-sm text-gray-600 animate-pulse">Verifying your email…</p>
          </div>
        )}

        {status === 'success' && (
          <div className="rounded-md bg-green-50 p-6 border border-green-200">
            <p className="text-base font-semibold text-green-800">{message}</p>
            <p className="mt-2 text-sm text-green-700">Taking you to your dashboard…</p>
            <button
              type="button"
              onClick={() => router.replace('/portal/dashboard')}
              className="mt-4 inline-flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark,#1d3d73)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--brand-primary)]"
            >
              Go to dashboard
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-md bg-red-50 p-6 border border-red-200">
            <p className="text-sm text-red-800">{message}</p>
            <p className="mt-3 text-sm text-gray-600">
              Sign in to your portal and use the “Resend” button on the banner to get a fresh link.
            </p>
            <button
              type="button"
              onClick={() => router.push('/portal/login')}
              className="mt-4 inline-flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark,#1d3d73)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--brand-primary)]"
            >
              Go to login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-gray-600">Loading…</div>
        </div>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
