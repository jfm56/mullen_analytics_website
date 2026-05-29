'use client';
export const dynamic = 'force-dynamic';

import AdminShell from '@/components/admin/AdminShell';

export default function AdminLayout({ children }) {
  return <AdminShell>{children}</AdminShell>;
}
