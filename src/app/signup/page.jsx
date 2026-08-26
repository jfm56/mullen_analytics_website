'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { auth, plans as plansApi } from '@/lib/api';

const NAVY = '#071829';
const BLUE = '#1D4ED8';

export default function SignupPage() {
  const [plans, setPlans] = useState([]);
  const [selected, setSelected] = useState('free_trial');
  const [form, setForm] = useState({ full_name: '', company: '', email: '', password: '' });
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    plansApi.list()
      .then((d) => setPlans(d.plans || []))
      .catch(() => setPlans([]))
      .finally(() => setLoadingPlans(false));
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('plan');
      if (p) setSelected(p);
    }
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const chosen = plans.find((p) => p.slug === selected);
  const isPaid = chosen && chosen.slug !== 'free_trial';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) { setError('Please enter a valid email address.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (!form.company.trim()) { setError('Please enter your agency name.'); return; }
    setSubmitting(true);
    try {
      await auth.register({ ...form, email: form.email.trim(), plan: selected });
      // Backend auto-creates the session cookie → land in the portal on a trial.
      window.location.href = '/portal/dashboard';
    } catch (err) {
      const m = err?.message;
      setError(m && !m.startsWith('[') && m !== 'Request failed'
        ? m
        : 'Could not create your account. Please check your details and try again.');
      setSubmitting(false);
    }
  }

  return (
    <div style={{ backgroundColor: '#F8FAFD' }} className="min-h-screen">
      {/* Header */}
      <section style={{ background: 'linear-gradient(180deg, #071829 0%, #0D2035 100%)' }}>
        <div className="max-w-5xl mx-auto px-6 py-12 md:py-16">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#0EA5E9' }}>Get started</p>
          <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: '#fff', letterSpacing: '-0.02em' }}>
            Create your agency account
          </h1>
          <p className="text-base" style={{ color: '#94A3B8', maxWidth: 560 }}>
            Start a free 30-day trial on your own data — no card required. Pick the plan that fits; you can change it anytime.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-10 grid lg:grid-cols-[1.1fr,0.9fr] gap-8">
        {/* Plan selection */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#64748B' }}>1 · Choose a plan</p>
          {loadingPlans ? (
            <div className="space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-20 bg-white border rounded-xl animate-pulse" />)}</div>
          ) : (
            <div className="space-y-3">
              {plans.map((p) => {
                const active = p.slug === selected;
                return (
                  <button
                    key={p.slug}
                    type="button"
                    onClick={() => setSelected(p.slug)}
                    className="w-full text-left rounded-xl p-4 transition-all"
                    style={{
                      backgroundColor: '#fff',
                      border: active ? `2px solid ${BLUE}` : '1px solid #E1E8F5',
                      boxShadow: active ? '0 10px 30px rgba(29,78,216,0.12)' : 'none',
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
                          style={{ border: active ? `5px solid ${BLUE}` : '2px solid #CBD5E1' }}
                        />
                        <span className="font-bold text-sm" style={{ color: NAVY }}>{p.name}</span>
                        {p.badge && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: '#EFF6FF', color: BLUE, border: '1px solid #BFDBFE' }}>
                            {p.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold" style={{ color: NAVY }}>{p.price_display}</span>
                        <span className="text-xs ml-0.5" style={{ color: '#64748B' }}>{p.period}</span>
                      </div>
                    </div>
                    <p className="text-xs mt-1.5 ml-6" style={{ color: '#475569' }}>{p.blurb}</p>
                    {active && (
                      <ul className="mt-2 ml-6 grid grid-cols-2 gap-x-3 gap-y-1">
                        {(p.features || []).map((f) => (
                          <li key={f} className="text-[11px] flex items-start gap-1.5" style={{ color: '#1E293B' }}>
                            <span style={{ color: '#0EA5E9' }}>✓</span> {f}
                          </li>
                        ))}
                      </ul>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Signup form */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#64748B' }}>2 · Your details</p>
          <form onSubmit={handleSubmit} className="bg-white border rounded-2xl p-6 space-y-4" style={{ borderColor: '#E1E8F5' }}>
            {[
              { k: 'company', label: 'Agency / organization', type: 'text', ph: 'South Branch EMS', auto: 'organization' },
              { k: 'full_name', label: 'Your name', type: 'text', ph: 'Jane Smith', auto: 'name' },
              { k: 'email', label: 'Work email', type: 'email', ph: 'you@agency.org', auto: 'email' },
              { k: 'password', label: 'Password', type: 'password', ph: 'At least 8 characters', auto: 'new-password' },
            ].map(({ k, label, type, ph, auto }) => (
              <div key={k}>
                <label className="block text-xs font-medium mb-1" style={{ color: '#334155' }}>{label}</label>
                <input
                  type={type}
                  autoComplete={auto}
                  placeholder={ph}
                  value={form[k]}
                  onChange={(e) => set(k, e.target.value)}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                  style={{ borderColor: '#E1E8F5' }}
                  required={k === 'email' || k === 'password' || k === 'company'}
                />
              </div>
            ))}

            {error && (
              <div className="text-sm rounded-lg px-3 py-2" style={{ backgroundColor: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-5 py-3 rounded-lg font-semibold text-sm text-white transition-colors disabled:opacity-60"
              style={{ backgroundColor: BLUE }}
            >
              {submitting ? 'Creating your account…' : `Start free trial${chosen ? ` — ${chosen.name}` : ''}`}
            </button>

            <p className="text-[11px] text-center" style={{ color: '#94A3B8' }}>
              30-day free trial on your own data.{' '}
              {isPaid ? 'We’ll reach out to activate your plan before the trial ends.' : 'No credit card required.'}
            </p>
            <p className="text-xs text-center" style={{ color: '#64748B' }}>
              Already have an account? <Link href="/portal/login" className="font-semibold" style={{ color: BLUE }}>Log in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
