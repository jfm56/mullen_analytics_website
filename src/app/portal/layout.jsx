'use client';
export const dynamic = 'force-dynamic';

import PortalShell from '@/components/portal/PortalShell';

export default function PortalLayout({ children }) {
  return <PortalShell>{children}</PortalShell>;
}
