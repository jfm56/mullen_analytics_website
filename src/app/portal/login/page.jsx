'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';

export default function PortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState('');

  // Check if already logged in
  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await auth.getSession();
        if (session.authenticated) {
          // Redirect based on role (impersonating admins go to portal)
          if (session.profile?.role === 'admin' && !session.impersonating) {
            router.replace('/admin');
          } else {
            router.replace('/portal');
          }
        }
      } catch (err) {
        // Not logged in, stay on login page
      } finally {
        setCheckingSession(false);
      }
    };
    checkSession();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) return;
    setLoading(true);

    try {
      const result = await auth.login(email, password);
      
      if (result.success) {
        // Get session to check role
        const session = await auth.getSession();
        if (session.profile?.role === 'admin' && !session.impersonating) {
          router.push('/admin');
        } else {
          router.push('/portal');
        }
      } else {
        setError(result.message || 'Login failed');
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking session
  if (checkingSession) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center text-gray-600 text-sm">
        Checking session...
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-16 px-4">
      <h1 className="text-2xl font-bold mb-2">Client Portal</h1>
      <p className="text-gray-600 mb-6 text-sm">
        Log in to upload data, view invoices, and access reports from Mullen Analytics &amp; AI Consulting LLC.
      </p>
      <div className="border rounded-lg p-6 shadow-sm bg-white">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 text-sm rounded-md bg-[var(--brand-primary)] text-white disabled:opacity-60"
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>
        <div className="mt-4 text-xs text-gray-600 text-center">
          <span>Contact us if you need access to the portal.</span>
        </div>
      </div>
    </div>
  );
}
