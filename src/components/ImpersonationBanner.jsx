'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, impersonation } from '@/lib/api';

export default function ImpersonationBanner() {
  const router = useRouter();
  const [status, setStatus] = useState(null);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Check session for impersonation flag
        const session = await auth.getSession();
        if (session.impersonating) {
          setStatus({
            active: true,
            client_name: session.profile?.full_name,
            client_email: session.profile?.email,
          });
        } else {
          setStatus(null);
        }
      } catch (e) {
        setStatus(null);
      }
    };
    checkStatus();
  }, []);

  const handleEndImpersonation = async () => {
    setEnding(true);
    try {
      await impersonation.end();
      router.push('/admin');
    } catch (e) {
      console.error('Failed to end impersonation:', e);
    } finally {
      setEnding(false);
    }
  };

  if (!status?.active) {
    return null;
  }

  return (
    <>
    <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500 text-white px-4 py-2">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg">👁️</span>
          <div>
            <p className="text-sm font-medium">
              Viewing as: {status.client_name || status.client_email}
            </p>
            <p className="text-xs opacity-80">
              You are viewing this portal as the client would see it
            </p>
          </div>
        </div>
        <button
          onClick={handleEndImpersonation}
          disabled={ending}
          className="px-3 py-1.5 bg-white text-orange-600 text-xs font-medium rounded hover:bg-orange-50 disabled:opacity-50"
        >
          {ending ? 'Ending...' : 'Exit Client View'}
        </button>
      </div>
    </div>
    {/* Spacer: the banner is position:fixed (out of flow) — reserve its height so
        it doesn't overlap the portal content below. */}
    <div aria-hidden className="h-[52px]" />
    </>
  );
}
