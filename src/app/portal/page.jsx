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
      <div className="border rounded-lg bg-white p-6 mb-8 shadow-sm">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            {profile?.logo_url && (
              <img 
                src={profile.logo_url} 
                alt="Company logo" 
                className="h-20 w-auto max-w-[250px] object-contain"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                CLIENT PORTAL
              </h1>
              <p className="text-gray-700 text-base mt-2">
                Welcome, {firstName}
              </p>
              <p className="text-gray-600 text-sm mt-1 max-w-2xl">
                This is your private workspace for your project with Mullen Analytics.
                You can share files, see progress, review results, and communicate with our team here.
              </p>
              <p className="text-gray-500 text-xs mt-3">
                Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleResetPassword}
              disabled={resettingPassword}
              className="text-xs text-gray-600 border px-3 py-1.5 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-left"
            >
              {resettingPassword ? 'Sending...' : '[ Reset password ]'}
              <span className="block text-[10px] text-gray-500 mt-1">Change your login password at any time.</span>
            </button>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-600 border px-3 py-1.5 rounded-md hover:bg-gray-50 text-left"
            >
              [ Log out ]
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

      <div className="border-t border-gray-300 my-8"></div>

      <section className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">NEXT CHECK-IN</h2>
        <div className="bg-gray-50 border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Next scheduled check-in:</p>
              <p className="text-sm text-gray-700 mt-1">Week of Jan 27, 2026</p>
            </div>
            <Link
              href="/portal/messages"
              className="text-sm text-[var(--brand-primary)] hover:underline font-medium"
            >
              [ Schedule or message us → ]
            </Link>
          </div>
          <p className="text-xs text-gray-600 mt-3">
            Use this link to schedule a call or send us a message.
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">QUICK ACTIONS</h2>
        <p className="text-sm text-gray-600 mb-4">Common things you may want to do.</p>
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
              <div className="text-xs text-gray-500">Safely share files or spreadsheets with us.</div>
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
              <div className="text-xs text-gray-500">See your charts, reports, and results.</div>
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
              <div className="text-xs text-gray-500">Ask questions or share feedback securely.</div>
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
              <div className="text-xs text-gray-500">See billing details and past invoices.</div>
            </div>
          </Link>
        </div>
      </section>

      <div className="border-t border-gray-300 my-8"></div>

      <section className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">PROJECT STATUS</h2>
        <p className="text-sm text-gray-600 mb-4">
          Below is a simple overview of where your project stands.
          We update this as work is completed.
        </p>
        
        <div className="border rounded-lg bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">Task</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 font-medium">Target date</th>
                  <th className="px-4 py-3 font-medium">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y">
              <tr>
                <td className="px-4 py-3">
                  <div className="font-medium text-sm">Data review and preparation</div>
                  <div className="text-xs text-gray-500">We review the files you send us and check for issues or missing information.</div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 border border-yellow-100">
                    In progress
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">Mullen Analytics</td>
                <td className="px-4 py-3 text-sm text-gray-700">Week of Jan 27, 2026</td>
                <td className="px-4 py-3">
                  <div className="w-24 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="h-2 bg-blue-600" style={{ width: '40%' }} />
                  </div>
                  <span className="text-xs text-gray-600 mt-1 inline-block">40%</span>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3">
                  <div className="font-medium text-sm">Dashboard and report setup</div>
                  <div className="text-xs text-gray-500">We design charts and reports based on your goals.</div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 border border-gray-200">
                    Planned
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">Mullen Analytics</td>
                <td className="px-4 py-3 text-sm text-gray-700">Waiting on data</td>
                <td className="px-4 py-3">
                  <div className="w-24 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="h-2 bg-gray-300" style={{ width: '0%' }} />
                  </div>
                  <span className="text-xs text-gray-600 mt-1 inline-block">0%</span>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3">
                  <div className="font-medium text-sm">Summary and recommendations</div>
                  <div className="text-xs text-gray-500">We prepare clear takeaways, next steps, and recommendations.</div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 border border-gray-200">
                    Planned
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">Mullen Analytics</td>
                <td className="px-4 py-3 text-sm text-gray-700">Week of Feb 10, 2026</td>
                <td className="px-4 py-3">
                  <div className="w-24 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="h-2 bg-gray-300" style={{ width: '0%' }} />
                  </div>
                  <span className="text-xs text-gray-600 mt-1 inline-block">0%</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 bg-gray-50 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">STATUS MEANING</span>
            <div className="flex flex-wrap gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-yellow-400"></span>
                <div>
                  <div className="font-medium">In progress</div>
                  <div className="text-xs">We are actively working on this.</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-gray-400"></span>
                <div>
                  <div className="font-medium">Planned</div>
                  <div className="text-xs">This step is coming up next.</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-green-500"></span>
                <div>
                  <div className="font-medium">Complete</div>
                  <div className="text-xs">This step is finished.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-gray-300 my-8"></div>

      <section className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">ACTION ITEMS FOR YOU</h2>
        <p className="text-sm text-gray-600 mb-4">These are the next things we may need from you.</p>
        
        <div className="border rounded-lg bg-blue-50 border-blue-200 overflow-hidden">
          <div className="p-4">
            <ul className="space-y-3 text-sm text-blue-900">
              <li className="flex items-start gap-3">
                <input type="checkbox" className="mt-1 rounded border-blue-300 text-blue-600 focus:ring-blue-500" />
                <div className="flex-1">
                  <Link href="/portal/uploads" className="text-blue-900 hover:text-blue-700 underline font-medium">
                    Upload data file
                  </Link>
                  <span className="text-blue-700 block">Please upload your updated spreadsheet or file.</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <input type="checkbox" className="mt-1 rounded border-blue-300 text-blue-600 focus:ring-blue-500" />
                <div className="flex-1">
                  <Link href="/portal/reports" className="text-blue-900 hover:text-blue-700 underline font-medium">
                    Review dashboard draft
                  </Link>
                  <span className="text-blue-700 block">We will notify you when this is ready.</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <input type="checkbox" className="mt-1 rounded border-blue-300 text-blue-600 focus:ring-blue-500" />
                <div className="flex-1">
                  <Link href="/portal/messages" className="text-blue-900 hover:text-blue-700 underline font-medium">
                    Approve key metrics
                  </Link>
                  <span className="text-blue-700 block">Send us a message with your approval or feedback.</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <div className="border-t border-gray-300 my-8"></div>

      <section className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">SECURITY NOTICE</h2>
        <div className="border rounded-lg bg-gray-50 p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <p className="text-sm text-gray-700 font-medium mb-1">Your information is protected.</p>
              <p className="text-sm text-gray-600">All data is securely transferred and only accessible to authorized users.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="text-center text-xs text-gray-500 mt-12">
        © 2026 Mullen Analytics & AI Consulting
      </div>
    </div>
  );
}
