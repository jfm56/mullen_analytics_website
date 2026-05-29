'use client';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/api';
import ImpersonationBanner from '@/components/ImpersonationBanner';

const NAV = [
  { label: 'Home',          href: '/portal',                icon: '🏠' },
  { label: 'Upload Data',   href: '/portal/uploads',        icon: '📤' },
  { label: 'Dashboards',    href: '/portal/dashboard',      icon: '📊' },
  { label: 'Data Explorer', href: '/portal/data-explorer',  icon: '🔍' },
  { label: 'Reports',       href: '/portal/reports',        icon: '📄' },
  { label: 'Messages',      href: '/portal/messages',       icon: '💬' },
  { label: 'Invoices',      href: '/portal/invoices',       icon: '💰' },
];

const BYPASS = ['/portal/login', '/portal/reset-password'];

export default function PortalShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [ready, setReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  const bypass = BYPASS.some(r => pathname.startsWith(r));

  useEffect(() => {
    if (bypass) { setReady(true); return; }
    auth.getSession().then((s) => {
      if (!s.authenticated) { router.replace('/portal/login'); return; }
      setProfile(s.profile);
      setReady(true);
      fetch('/api/proxy/messages/unread-count', { credentials: 'include' })
        .then(r => r.json()).then(d => setUnread(d.count || 0)).catch(() => {});
    }).catch(() => router.replace('/portal/login'));
  }, [router, bypass]);

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-sm text-gray-400 animate-pulse">Loading…</div>
    </div>
  );

  if (bypass) return <>{children}</>;

  const isActive = (href) => href === '/portal' ? pathname === '/portal' : pathname.startsWith(href);

  return (
    <>
      <ImpersonationBanner />
      <div className="flex min-h-screen bg-gray-50">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-52 bg-white border-r flex-shrink-0">
          <div className="px-4 py-4 border-b">
            <p className="font-bold text-sm text-gray-900 truncate">Mullen Analytics</p>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{profile?.full_name || profile?.email || 'Client Portal'}</p>
          </div>
          <nav className="flex-1 py-3 overflow-y-auto">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                  isActive(item.href)
                    ? 'bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="w-4 text-center">{item.icon}</span>
                <span>{item.label}</span>
                {item.href === '/portal/messages' && unread > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{unread}</span>
                )}
              </Link>
            ))}
          </nav>
          <div className="border-t p-3">
            <button
              onClick={async () => { await auth.logout?.(); router.push('/portal/login'); }}
              className="w-full text-left px-2 py-2 text-xs text-gray-500 hover:text-red-600 rounded transition-colors"
            >
              Sign out
            </button>
          </div>
        </aside>

        {/* Mobile topbar */}
        <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b z-30 flex items-center px-4 gap-3">
          <button onClick={() => setMobileOpen(v => !v)} className="p-1.5 rounded hover:bg-gray-100">
            ☰
          </button>
          <span className="font-semibold text-sm text-gray-900">Mullen Analytics</span>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-40 flex">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <div className="relative w-56 bg-white h-full flex flex-col">
              <div className="px-4 py-4 border-b flex items-center justify-between">
                <span className="font-bold text-sm text-gray-900">Menu</span>
                <button onClick={() => setMobileOpen(false)} className="text-gray-400 text-lg">×</button>
              </div>
              <nav className="flex-1 py-3">
                {NAV.map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm ${isActive(item.href) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <span>{item.icon}</span><span>{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0 md:overflow-auto">
          <main className="md:mt-0 mt-14 p-4 md:p-6 max-w-5xl mx-auto">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
