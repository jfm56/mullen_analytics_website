'use client';

import { useLastLoginTracking } from '@/hooks/useLastLoginTracking';

export const dynamic = 'force-dynamic';

export default function PortalLayout({ children }) {
  // Track last login when client accesses any portal page
  useLastLoginTracking();
  
  return children;
}
