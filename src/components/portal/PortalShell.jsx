'use client';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Home, Upload, BarChart3, Search, FileText,
  MessageSquare, Receipt, Database, Settings, Menu, X, LogOut, Lightbulb, Globe,
  Activity, ExternalLink, MailWarning,
} from 'lucide-react';
import { auth, emsQa } from '@/lib/api';
import ImpersonationBanner from '@/components/ImpersonationBanner';
import ClientErrorReporter from '@/components/ClientErrorReporter';

const NAV = [
  { label: 'Home',          href: '/portal',                Icon: Home },
  { label: 'Upload Data',   href: '/portal/uploads',        Icon: Upload },
  { label: 'Dashboards',    href: '/portal/dashboard',      Icon: BarChart3 },
  { label: 'Data Explorer', href: '/portal/data-explorer',  Icon: Search },
  { label: 'Reports',       href: '/portal/reports',        Icon: FileText },
  { label: 'Messages',      href: '/portal/messages',       Icon: MessageSquare },
  { label: 'Feedback',      href: '/portal/feedback',       Icon: Lightbulb },
  { label: 'Invoices',      href: '/portal/invoices',       Icon: Receipt },
  { label: 'Datasets',      href: '/portal/datasets',       Icon: Database },
  { label: 'Settings',      href: '/portal/settings',       Icon: Settings },
];

const BYPASS = ['/portal/login', '/portal/reset-password', '/portal/verify-email'];

export default function PortalShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [ready, setReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [planFeatures, setPlanFeatures] = useState(null);
  const [verifyNeeded, setVerifyNeeded] = useState(false);
  const [verifyAddr, setVerifyAddr] = useState('');
  const [resendState, setResendState] = useState('idle'); // idle | sending | sent | error

  const bypass = BYPASS.some(r => pathname.startsWith(r));

  useEffect(() => {
    if (bypass) { setReady(true); return; }
    auth.getSession().then((s) => {
      if (!s.authenticated) { router.replace('/portal/login'); return; }
      setProfile(s.profile);
      // Nudge unverified self-serve users (not admins, not while impersonating).
      const needs = s.user?.email_confirmed === false && !s.impersonating && s.profile?.role !== 'admin';
      setVerifyNeeded(!!needs);
      setVerifyAddr(s.user?.email || s.profile?.email || '');
      setReady(true);
      fetch('/api/proxy/messages/unread-count', { credentials: 'include' })
        .then(r => r.json()).then(d => setUnread(d.count || 0)).catch(() => {});
      fetch('/api/proxy/plans/me', { credentials: 'include' })
        .then(r => r.json()).then(d => setPlanFeatures(d.features || {})).catch(() => {});
    }).catch(() => router.replace('/portal/login'));
  }, [router, bypass]);

  const handleResend = async () => {
    setResendState('sending');
    try {
      await auth.resendVerification();
      setResendState('sent');
    } catch {
      setResendState('error');
    }
  };

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-sm text-gray-400 animate-pulse">Loading…</div>
    </div>
  );

  if (bypass) return <>{children}</>;

  const isActive = (href) => href === '/portal' ? pathname === '/portal' : pathname.startsWith(href);

  // Plan gating: hide nav items the current plan doesn't include (backend also
  // enforces with a 403). Show everything until entitlements load to avoid flicker.
  const GATED_NAV = { '/portal/data-explorer': 'data_explorer', '/portal/datasets': 'compare_years' };
  const navAllowed = ({ href }) => {
    const feat = GATED_NAV[href];
    return !feat || !planFeatures || planFeatures[feat];
  };

  const renderNavItems = (onNavigate) => (
    <>
      {NAV.filter(navAllowed).map(({ label, href, Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 ${
              active
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Icon size={18} className="flex-shrink-0" />
            <span>{label}</span>
            {href === '/portal/messages' && unread > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[10px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center">{unread}</span>
            )}
          </Link>
        );
      })}
      {profile?.ems_qa_enabled && (
        <button
          type="button"
          onClick={() => { onNavigate?.(); emsQa.open().catch(() => {}); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg transition-colors text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"
        >
          <Activity size={18} className="flex-shrink-0" />
          <span>QA Platform</span>
          <ExternalLink size={14} className="ml-auto text-gray-400" />
        </button>
      )}
    </>
  );

  return (
    <>
      <ImpersonationBanner />
      <ClientErrorReporter />
      <div className="flex min-h-screen bg-gray-50">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-200 flex-shrink-0">
          <div className="px-4 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2.5">
              <Image src="/navbar-logo.png" alt="Mullen Analytics" width={28} height={28} priority className="object-contain" style={{ width: 'auto', height: 26 }} />
              <div className="min-w-0">
                <p className="font-bold text-sm text-gray-900 truncate leading-tight">Mullen Analytics</p>
                <p className="text-[11px] text-gray-500 truncate leading-tight">{profile?.full_name || profile?.email || 'Client Portal'}</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
            {renderNavItems()}
          </nav>
          <div className="border-t border-gray-200 p-2 space-y-0.5">
            <Link
              href="/"
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"
            >
              <Globe size={18} className="flex-shrink-0" />
              <span>Main site</span>
            </Link>
            <button
              onClick={async () => { await auth.logout?.(); router.push('/portal/login'); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-red-600 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"
            >
              <LogOut size={18} className="flex-shrink-0" />
              <span>Sign out</span>
            </button>
          </div>
        </aside>

        {/* Mobile topbar */}
        <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-30 flex items-center px-4 gap-3">
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="p-1.5 -ml-1.5 rounded-md hover:bg-gray-100 text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <Image src="/navbar-logo.png" alt="" width={24} height={24} className="object-contain" style={{ width: 'auto', height: 22 }} />
            <span className="font-semibold text-sm text-gray-900">Mullen Analytics</span>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-40 flex">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <div className="relative w-64 bg-white h-full flex flex-col shadow-xl">
              <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Image src="/navbar-logo.png" alt="" width={24} height={24} className="object-contain" style={{ width: 'auto', height: 22 }} />
                  <span className="font-bold text-sm text-gray-900">Mullen Analytics</span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>
              <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
                {renderNavItems(() => setMobileOpen(false))}
              </nav>
              <div className="border-t border-gray-200 p-2 space-y-0.5">
                <Link
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors"
                >
                  <Globe size={18} className="flex-shrink-0" />
                  <span>Main site</span>
                </Link>
                <button
                  onClick={async () => { setMobileOpen(false); await auth.logout?.(); router.push('/portal/login'); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-red-600 rounded-lg transition-colors"
                >
                  <LogOut size={18} className="flex-shrink-0" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0 md:overflow-auto">
          <main className="md:mt-0 mt-14 p-4 md:p-6 max-w-5xl mx-auto">
            {verifyNeeded && (
              <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <MailWarning size={20} className="text-amber-600 flex-shrink-0" />
                <div className="flex-1 min-w-0 text-sm">
                  <p className="font-semibold text-amber-900">Verify your email to enable data uploads.</p>
                  <p className="text-amber-800">
                    We sent a link to <span className="font-medium">{verifyAddr}</span>. Your 14-day trial is active in the meantime.
                  </p>
                  {resendState === 'error' && (
                    <p className="text-red-700 mt-1">Couldn’t resend right now — please try again shortly.</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendState === 'sending' || resendState === 'sent'}
                  className="flex-shrink-0 inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                >
                  {resendState === 'sent' ? 'Email sent ✓' : resendState === 'sending' ? 'Sending…' : 'Resend email'}
                </button>
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
