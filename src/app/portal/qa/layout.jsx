'use client';
import { useCallback, useEffect, useState } from 'react';
import { auth } from '@/lib/api';
import { QaUnavailable } from '@/lib/qa';
import MfaEnroll from '@/components/mfa/MfaEnroll';
import MfaChallenge from '@/components/mfa/MfaChallenge';
import { SkeletonCard } from '@/components/ui/LoadingSkeleton';

/**
 * Gate for the in-portal EMS QA section. QA requires (1) the account is EMS-QA-
 * entitled and (2) MFA is satisfied — the portal is the single auth authority, so
 * this preserves the EMS QA MFA guarantee at the one login. The backend QA proxy
 * enforces the same checks; this layout is the matching UX so members land on the
 * enroll/verify step instead of a raw error.
 */
export default function QaLayout({ children }) {
  const [state, setState] = useState('loading'); // loading | ok | not_enabled | enroll | verify | error
  const [message, setMessage] = useState('');

  const evaluate = useCallback(async () => {
    try {
      const s = await auth.getSession();
      if (!s.authenticated) { setState('error'); setMessage('Please sign in.'); return; }
      if (!s.profile?.ems_qa_enabled) { setState('not_enabled'); return; }
      if (!s.mfa_enabled) { setState('enroll'); return; }
      if (s.mfa_required) { setState('verify'); return; }
      setState('ok');
    } catch {
      setState('error');
      setMessage('Could not load your account. Please try again.');
    }
  }, []);

  useEffect(() => { evaluate(); }, [evaluate]);

  if (state === 'loading') {
    return <div className="max-w-md mx-auto mt-8"><SkeletonCard /></div>;
  }
  if (state === 'not_enabled') return <QaUnavailable />;
  if (state === 'error') return <QaUnavailable error={message} />;

  if (state === 'enroll') {
    return (
      <div className="mt-8">
        <p className="text-center text-sm text-gray-500 mb-4 max-w-md mx-auto">
          EMS QA handles protected quality data, so two-factor authentication is required before you can open it.
        </p>
        <MfaEnroll
          heading="Enable two-factor authentication for QA"
          onDone={evaluate}
        />
      </div>
    );
  }

  if (state === 'verify') {
    return (
      <div className="mt-8">
        <MfaChallenge title="Verify it's you to open EMS QA" onVerified={evaluate} />
      </div>
    );
  }

  return children;
}
