'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth } from '@/lib/api';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';
import AdminBreadcrumbs from './AdminBreadcrumbs';
import ClientErrorReporter from '@/components/ClientErrorReporter';

import { getAdminTitle } from '@/lib/adminNavigation.mjs';

export default function AdminShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState(null);
  const [ready, setReady] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (isLoginPage) { setReady(true); return; }
    auth.getSession().then((s) => {
      if (!s.authenticated || s.profile?.role !== 'admin') {
        router.replace('/admin/login');
        return;
      }
      setProfile(s.profile);
      setReady(true);
    }).catch(() => router.replace('/admin/login'));
  }, [router, isLoginPage]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-400 animate-pulse">Loading…</div>
      </div>
    );
  }

  if (isLoginPage) return <>{children}</>;

  return (
    <>
    <ClientErrorReporter />
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <div className="flex flex-col flex-1 min-w-0">
        <AdminTopbar title={getAdminTitle(pathname)} profile={profile} />
        <details className="border-b border-gray-200 bg-white lg:hidden">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-800">Admin navigation</summary>
          <AdminSidebar mobile />
        </details>
        <main className="flex-1 min-w-0 p-4 sm:p-6 overflow-auto">
          <AdminBreadcrumbs />
          {children}
        </main>
      </div>
    </div>
    </>
  );
}
