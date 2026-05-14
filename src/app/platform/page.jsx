'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PlatformPage() {
  const router = useRouter();
  const [loading, setLoading]   = useState(true);
  const [agencies, setAgencies] = useState([]);
  const [user, setUser]         = useState(null);
  const [profile, setProfile]   = useState(null);
  const [error, setError]       = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/proxy/auth/session', { credentials: 'include' });
        const session = await res.json();
        if (!session.authenticated) {
          router.replace('/portal/login');
          return;
        }
        setUser(session.user);
        setProfile(session.profile);

        const agRes = await fetch('/api/proxy/agencies/me', { credentials: 'include' });
        const agData = await agRes.json();
        setAgencies(Array.isArray(agData) ? agData : []);
      } catch {
        setError('Could not load platform data.');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Loading platform…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-gray-900">Mullen Analytics</span>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Platform</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{user?.email}</span>
          {profile?.role === 'admin' && (
            <Link
              href="/platform/admin"
              className="text-xs text-red-600 border border-red-200 px-3 py-1.5 rounded-md hover:bg-red-50 font-medium"
            >
              Admin
            </Link>
          )}
          <button
            onClick={async () => {
              await fetch('/api/proxy/auth/logout', { method: 'POST', credentials: 'include' });
              router.push('/portal/login');
            }}
            className="text-xs text-gray-600 border px-3 py-1.5 rounded-md hover:bg-gray-50"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {error && <p className="text-sm text-red-600 mb-6">{error}</p>}

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Analytics Platform</h1>
          <p className="text-sm text-gray-500">
            Upload operational data, run your analytics pipeline, and view insights.
          </p>
        </div>

        {agencies.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-800 mb-2">No agency set up yet</h2>
            <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
              Create your agency account to start uploading data and running your analytics pipeline.
            </p>
            <Link
              href="/platform/onboarding"
              className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Set up your agency
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-800">Your Agencies</h2>
              <Link
                href="/platform/onboarding"
                className="text-xs text-blue-600 border border-blue-200 px-3 py-1.5 rounded-md hover:bg-blue-50"
              >
                + Add agency
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {agencies.map((agency) => (
                <Link
                  key={agency.id}
                  href={`/platform/${agency.id}`}
                  className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                        {agency.agency_name}
                      </h3>
                      {agency.state && (
                        <p className="text-xs text-gray-500 mt-0.5">{agency.state}</p>
                      )}
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      agency.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {agency.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="capitalize">
                      {agency.subscription_tier} tier
                    </span>
                    {agency.agency_type && (
                      <>
                        <span>·</span>
                        <span className="capitalize">{agency.agency_type.replace('_', ' ')}</span>
                      </>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <span className="text-[11px] text-blue-600 font-medium group-hover:underline">
                      Open dashboard →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
