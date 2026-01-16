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
  const [profile, setProfile] = useState(null);
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
        .select('role, logo_url, full_name, company')
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
      setProfile(profile);
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
      <div className="border rounded-lg bg-white p-4 mb-8 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {profile?.logo_url && (
              <img 
                src={profile.logo_url} 
                alt="Company logo" 
                className="h-16 w-auto max-w-[200px] object-contain"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {profile?.company || 'Client'} Portal
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                Welcome, {firstName}. Your secure workspace for analytics delivery.
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Last updated: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleResetPassword}
              disabled={resettingPassword}
              className="text-xs text-gray-600 border px-3 py-1.5 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resettingPassword ? 'Sending...' : 'Reset password'}
            </button>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-600 border px-3 py-1.5 rounded-md hover:bg-gray-50"
            >
              Log out
            </button>
          </div>
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

      <section className="mb-8 border rounded-lg bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold">Next Check-in</h2>
            <p className="text-xs text-gray-600 mt-0.5">
              Week of Jan 27, 2026
            </p>
          </div>
          <Link
            href="/portal/messages"
            className="text-xs text-[var(--brand-primary)] hover:underline"
          >
            Schedule check-in →
          </Link>
        </div>
      </section>

      <section className="mb-8 border rounded-lg bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">Quick Actions</h2>
          <p className="text-xs text-gray-600 mt-0.5">
            Common tasks to manage your engagement.
          </p>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/portal/uploads"
            className="flex items-center gap-3 p-3 border rounded-md hover:bg-gray-50 transition-colors"
          >
            <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">Upload new data</div>
              <div className="text-xs text-gray-500">Share files securely</div>
            </div>
          </Link>
          <Link
            href="/portal/reports"
            className="flex items-center gap-3 p-3 border rounded-md hover:bg-gray-50 transition-colors"
          >
            <div className="flex-shrink-0 w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">View dashboards & reports</div>
              <div className="text-xs text-gray-500">Access your analytics</div>
            </div>
          </Link>
          <Link
            href="/portal/messages"
            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">Message the team</div>
              <div className="text-xs text-gray-500">Questions, updates, support</div>
            </div>
            {unreadMessages > 0 && (
              <span className="ml-auto inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] w-4 h-4">
                {unreadMessages}
              </span>
            )}
          </Link>
          <Link
            href="/portal/invoices"
            className="flex items-center gap-3 p-3 border rounded-md hover:bg-gray-50 transition-colors"
          >
            <div className="flex-shrink-0 w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">View invoices</div>
              <div className="text-xs text-gray-500">Billing and payments</div>
            </div>
          </Link>
        </div>
      </section>

      <section className="mb-8 border rounded-lg bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">Project Overview</h2>
          <p className="text-xs text-gray-600 mt-1">
            Below is the current status of your engagement. Updates are posted as milestones are reached.
          </p>
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
                <td className="px-4 py-2 text-[12px] text-gray-700">Target: Week of 01/27</td>
                <td className="px-4 py-2">
                  <div className="w-32 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="h-2 bg-[var(--brand-primary)]" style={{ width: '40%' }} />
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
                <td className="px-4 py-2 text-[12px] text-gray-700">Pending data</td>
                <td className="px-4 py-2">
                  <div className="w-32 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="h-2 bg-gray-300" style={{ width: '0%' }} />
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
                    Planned
                  </span>
                </td>
                <td className="px-4 py-2 text-[12px] text-gray-700">Mullen Analytics</td>
                <td className="px-4 py-2 text-[12px] text-gray-700">Target: Week of 02/10</td>
                <td className="px-4 py-2">
                  <div className="w-32 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="h-2 bg-gray-300" style={{ width: '0%' }} />
                  </div>
                  <span className="text-[11px] text-gray-600 mt-1 inline-block">0%</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 bg-gray-50 border-t">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-gray-700">Status Legend</span>
            <div className="flex flex-wrap gap-4 text-[11px] text-gray-600">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-yellow-400"></span>
                <span>In progress</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-gray-400"></span>
                <span>Planned</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                <span>Complete</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8 border rounded-lg bg-blue-50 border-blue-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-blue-200 bg-blue-100">
          <h2 className="text-sm font-semibold text-blue-900">What we need from you</h2>
        </div>
        <div className="p-4">
          <ul className="space-y-3 text-sm text-blue-900">
            <li className="flex items-start gap-3">
              <input type="checkbox" className="mt-1 rounded border-blue-300 text-blue-600 focus:ring-blue-500" />
              <div className="flex-1">
                <Link href="/portal/uploads" className="text-blue-900 hover:text-blue-700 underline">
                  Upload CSV data
                </Link>
                <span className="text-blue-700"> - Updated call volume data needed</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <input type="checkbox" className="mt-1 rounded border-blue-300 text-blue-600 focus:ring-blue-500" />
              <div className="flex-1">
                <Link href="/portal/reports" className="text-blue-900 hover:text-blue-700 underline">
                  Review draft dashboard
                </Link>
                <span className="text-blue-700"> - Available soon</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <input type="checkbox" className="mt-1 rounded border-blue-300 text-blue-600 focus:ring-blue-500" />
              <div className="flex-1">
                <Link href="/portal/messages" className="text-blue-900 hover:text-blue-700 underline">
                  Approve KPI definitions
                </Link>
                <span className="text-blue-700"> - Message the team with feedback</span>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <div className="mt-12 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>All data is encrypted in transit and access-controlled. Only authorized users can view your information.</span>
        </div>
      </div>
    </div>
  );
}
