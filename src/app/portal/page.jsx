'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useUnreadMessagesCount } from '@/hooks/useUnreadMessagesCount';

export default function PortalHomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [resetStatus, setResetStatus] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const billingPortalUrl = process.env.NEXT_PUBLIC_STRIPE_BILLING_PORTAL_URL;
  const unreadMessages = useUnreadMessagesCount();

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/portal/login');
        return;
      }

      // Check role in profiles; admins are redirected to /admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      // TEMP: debug logs to verify role lookup
      // eslint-disable-next-line no-console
      console.log('portal session user id:', session.user.id);
      // eslint-disable-next-line no-console
      console.log('portal profile:', profile);

      if (profile?.role === 'admin') {
        router.replace('/admin');
        return;
      }

      setUser(session.user);
      setLoading(false);
    };

    checkSession();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/portal/login');
  };

  const handleResetPassword = async () => {
    setResetStatus('');
    setResettingPassword(true);
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser?.email) {
        setResetStatus('error:Unable to get your email address');
        setResettingPassword(false);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(currentUser.email, {
        redirectTo: `${window.location.origin}/portal/reset-password`,
      });

      if (error) {
        setResetStatus(`error:${error.message}`);
      } else {
        setResetStatus('success:Password reset email sent! Check your inbox.');
      }
    } catch (e) {
      setResetStatus(`error:${e.message || 'Failed to send reset email'}`);
    } finally {
      setResettingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center text-gray-600 text-sm">Checking your session...</div>
    );
  }

  if (!user) return null;

  const firstName = user.user_metadata?.first_name || user.email;

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Client Portal</h1>
          <p className="text-gray-600 text-sm mt-1">
            Welcome, {firstName}. Track progress, upload data, and access billing and deliverables.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleResetPassword}
            disabled={resettingPassword}
            className="self-start text-xs text-gray-600 border px-3 py-1.5 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resettingPassword ? 'Sending...' : 'Reset my password'}
          </button>
          <button
            onClick={handleLogout}
            className="self-start text-xs text-gray-600 border px-3 py-1.5 rounded-md hover:bg-gray-50"
          >
            Log out
          </button>
        </div>
      </div>

      {resetStatus && (
        <div className={`mb-4 p-3 rounded-md text-sm ${
          resetStatus.startsWith('success:') 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {resetStatus.split(':')[1]}
        </div>
      )}

      <div className="mb-6 border-b border-gray-200 bg-[var(--brand-primary)]/5 rounded-t-md">
        <nav className="flex flex-wrap gap-4 text-xs px-4 pt-3 items-center">
          <Link
            href="/portal"
            className="inline-flex items-center rounded-t-md bg-[var(--brand-primary)] text-white px-3 pb-2 border-b-2 border-[var(--brand-primary)]"
          >
            Home
          </Link>
          <Link
            href="/portal/uploads"
            className="inline-flex items-center border-b-2 border-transparent pb-2 text-gray-600 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] px-3"
          >
            Upload data
          </Link>
          <Link
            href="/portal/invoices"
            className="inline-flex items-center border-b-2 border-transparent pb-2 text-gray-600 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] px-3"
          >
            View &amp; pay invoices
          </Link>
          <Link
            href="/portal/reports"
            className="inline-flex items-center border-b-2 border-transparent pb-2 text-gray-600 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] px-3"
          >
            Dashboards &amp; deliverables
          </Link>
          <Link
            href="/portal/messages"
            className="ml-auto inline-flex items-center border-b-2 border-transparent pb-2 text-gray-600 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] px-3"
          >
            <span>Messages</span>
            {unreadMessages > 0 && (
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] w-4 h-4">
                {unreadMessages}
              </span>
            )}
          </Link>
        </nav>
      </div>

      <section className="mb-8 border rounded-lg bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Project overview</h2>
            <p className="text-xs text-gray-600 mt-0.5">
              High-level view of current tasks and status for your active engagement.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50">
              <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500">
                <th className="px-4 py-2 font-medium">Task</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Owner</th>
                <th className="px-4 py-2 font-medium">Target date</th>
                <th className="px-4 py-2 font-medium">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="px-4 py-2">
                  <div className="font-medium text-[13px]">Data intake & quality checks</div>
                  <div className="text-[11px] text-gray-500">Initial data upload, validation, and profiling.</div>
                </td>
                <td className="px-4 py-2">
                  <span className="inline-flex items-center rounded-full bg-yellow-50 px-2 py-0.5 text-[11px] font-medium text-yellow-800 border border-yellow-100">
                    In progress
                  </span>
                </td>
                <td className="px-4 py-2 text-[12px] text-gray-700">Mullen Analytics</td>
                <td className="px-4 py-2 text-[12px] text-gray-700">TBD</td>
                <td className="px-4 py-2">
                  <div className="w-24 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className="h-1.5 bg-[var(--brand-primary)]" style={{ width: '40%' }} />
                  </div>
                  <span className="text-[11px] text-gray-600 mt-1 inline-block">40%</span>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2">
                  <div className="font-medium text-[13px]">Dashboard & reporting design</div>
                  <div className="text-[11px] text-gray-500">Define KPIs, layout, and key decision workflows.</div>
                </td>
                <td className="px-4 py-2">
                  <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-700 border border-gray-200">
                    Planned
                  </span>
                </td>
                <td className="px-4 py-2 text-[12px] text-gray-700">Mullen Analytics</td>
                <td className="px-4 py-2 text-[12px] text-gray-700">TBD</td>
                <td className="px-4 py-2">
                  <div className="w-24 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className="h-1.5 bg-gray-300" style={{ width: '0%' }} />
                  </div>
                  <span className="text-[11px] text-gray-600 mt-1 inline-block">0%</span>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2">
                  <div className="font-medium text-[13px]">Executive readout & recommendations</div>
                  <div className="text-[11px] text-gray-500">Synthesis of findings, slides, and next steps.</div>
                </td>
                <td className="px-4 py-2">
                  <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-700 border border-gray-200">
                    Not started
                  </span>
                </td>
                <td className="px-4 py-2 text-[12px] text-gray-700">Mullen Analytics</td>
                <td className="px-4 py-2 text-[12px] text-gray-700">TBD</td>
                <td className="px-4 py-2">
                  <div className="w-24 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className="h-1.5 bg-gray-300" style={{ width: '0%' }} />
                  </div>
                  <span className="text-[11px] text-gray-600 mt-1 inline-block">0%</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
