'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { portalBrand } from '@/lib/portalBrand';
import { auth } from '@/lib/api';
import MfaChallenge from '@/components/mfa/MfaChallenge';
import MfaEnroll from '@/components/mfa/MfaEnroll';

// Brand background — explicit colors so the page reads correctly regardless of
// the visitor's OS light/dark preference (the theme CSS variables flip in dark
// mode, which is what made the old white-card form hard to read).
const PAGE_BG = { background: 'linear-gradient(160deg, #071829 0%, #0D2035 55%, #071829 100%)' };

export default function PortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState('');
  const [mfaStep, setMfaStep] = useState(null); // null | enroll | verify

  const redirectByRole = async () => {
    const session = await auth.getSession();
    if (session.profile?.role === 'admin' && !session.impersonating) {
      router.push('/admin');
    } else {
      router.push('/portal');
    }
  };

  const backToSignIn = async () => {
    await auth.logout().catch(() => {});
    setMfaStep(null);
    setPassword('');
    setError('');
  };

  // Check if already logged in
  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await auth.getSession();
        if (session.authenticated) {
          if (session.mfa_enrollment_required) {
            setMfaStep('enroll');
          } else if (session.mfa_required) {
            setMfaStep('verify');
          } else if (session.profile?.role === 'admin' && !session.impersonating) {
            router.replace('/admin');
          } else {
            router.replace('/portal');
          }
        }
      } catch {
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
        if (result.mfa_enrollment_required) {
          // Client accounts require MFA; enroll before the first portal screen.
          setMfaStep('enroll');
          setLoading(false);
          return;
        }
        if (result.mfa_required) {
          // Password OK; session is pending until a TOTP code is verified.
          setMfaStep('verify');
          setLoading(false);
          return;
        }
        await redirectByRole();
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
      <div className="min-h-screen flex items-center justify-center" style={PAGE_BG}>
        <div className="text-sm animate-pulse" style={{ color: '#94A3B8' }}>Checking session…</div>
      </div>
    );
  }

  // First-time enrollment for client accounts happens immediately after
  // the password is accepted, before any portal content is shown.
  if (mfaStep === 'enroll') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12" style={PAGE_BG}>
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-7">
            <Image src={portalBrand.logo} alt={portalBrand.name} width={48} height={48} priority className="object-contain" style={{ width: 'auto', height: 44 }} />
            <span className="mt-3 font-bold text-lg" style={{ color: '#F1F5F9', letterSpacing: '-0.01em' }}>{portalBrand.name}</span>
            <span className="mt-1 text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#0EA5E9' }}>{portalBrand.label}</span>
          </div>
          <MfaEnroll
            heading="Secure your account"
            intro="Your client portal requires two-factor authentication. Scan the QR code with your authenticator app, then enter the 6-digit code."
            onDone={redirectByRole}
          />
          <button
            type="button"
            onClick={backToSignIn}
            className="mt-4 block mx-auto text-xs hover:underline"
            style={{ color: '#94A3B8' }}
          >
            ← Back to sign in
          </button>
        </div>
      </div>
    );
  }

  // Returning users complete two-factor verification after their password.
  if (mfaStep === 'verify') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12" style={PAGE_BG}>
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-7">
            <Image src={portalBrand.logo} alt={portalBrand.name} width={48} height={48} priority className="object-contain" style={{ width: 'auto', height: 44 }} />
            <span className="mt-3 font-bold text-lg" style={{ color: '#F1F5F9', letterSpacing: '-0.01em' }}>{portalBrand.name}</span>
            <span className="mt-1 text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#0EA5E9' }}>{portalBrand.label}</span>
          </div>
          <div className="rounded-2xl p-7" style={{ backgroundColor: '#FFFFFF', boxShadow: '0 24px 60px rgba(0,0,0,0.45)' }}>
            <MfaChallenge compact onVerified={redirectByRole} />
            <button
              type="button"
              onClick={backToSignIn}
              className="mt-4 text-xs hover:underline"
              style={{ color: '#64748B' }}
            >
              ← Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={PAGE_BG}>
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center mb-7">
          <Image
            src={portalBrand.logo}
            alt={portalBrand.name}
            width={48}
            height={48}
            priority
            className="object-contain"
            style={{ width: 'auto', height: 44 }}
          />
          <span className="mt-3 font-bold text-lg" style={{ color: '#F1F5F9', letterSpacing: '-0.01em' }}>
            {portalBrand.name}
          </span>
          <span className="mt-1 text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#0EA5E9' }}>
            {portalBrand.label}
          </span>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-7" style={{ backgroundColor: '#FFFFFF', boxShadow: '0 24px 60px rgba(0,0,0,0.45)' }}>
          <h1 className="text-xl font-bold mb-1" style={{ color: '#071829' }}>Sign in</h1>
          <p className="text-sm mb-6" style={{ color: '#475569' }}>
            Upload data, view invoices, and access your reports.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: '#334155' }}>
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg px-3 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-colors"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-sm font-medium" style={{ color: '#334155' }}>
                  Password
                </label>
                <Link href="/portal/reset-password" className="text-xs font-medium hover:underline" style={{ color: '#1D4ED8' }}>
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg px-3 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-colors"
              />
            </div>

            {error && (
              <p className="text-sm rounded-md px-3 py-2" style={{ color: '#B91C1C', backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 text-sm font-semibold rounded-lg text-white transition-colors"
              style={{ backgroundColor: loading ? '#3B5BB5' : '#1D4ED8', cursor: loading ? 'not-allowed' : 'pointer' }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#2563EB'; }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#1D4ED8'; }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-5 text-xs text-center" style={{ color: '#64748B' }}>
            Need access?{' '}
            <a href="/contact" className="font-medium hover:underline" style={{ color: '#1D4ED8' }}>Contact us</a>{' '}
            to get set up.
          </p>
        </div>

        <p className="mt-6 text-center text-xs">
          <Link href={portalBrand.homeUrl} className="hover:underline" style={{ color: '#94A3B8' }}>← Back to {portalBrand.name}</Link>
        </p>
      </div>
    </div>
  );
}
