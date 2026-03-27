'use client';

import { useLastLoginTracking } from '@/hooks/useLastLoginTracking';
import ImpersonationBanner from '@/components/ImpersonationBanner';

export const dynamic = 'force-dynamic';

export default function PortalLayout({ children }) {
  // Track last login when client accesses any portal page
  useLastLoginTracking();
  
  return (
    <>
      <ImpersonationBanner />
      <div className="impersonation-content">
        {children}
      </div>
    </>
  );
}
