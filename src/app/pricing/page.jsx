import Link from 'next/link';

export const metadata = {
  title: 'Pricing | Mullen Analytics & AI Consulting',
  description:
    'Mullen Analytics EMS Intelligence Platform pricing — QA/QI, staffing forecasts, operational analytics, and protocol compliance. Start free, scale by call volume, with cloud and on-prem (PHI) deployment options.',
};

const CALENDAR_URL = 'https://calendar.app.google/1BFgdi2pgjF9vwAB8';

// ── Cloud subscription tiers ─────────────────────────────────────────────────
const TIERS = [
  {
    name: 'Free Trial',
    badge: '14 days',
    price: '$0',
    period: '',
    annual: 'No card required',
    sub: 'Prove the value on your own charts.',
    features: [
      '500 charts',
      '2 users',
      'CSV upload',
      'Built-in QA rules',
      'Basic dashboard',
      'AI reviewer (up to 50 charts)',
    ],
    cta: 'Start free trial',
    href: '/signup?plan=free_trial',
    highlight: false,
  },
  {
    name: 'Starter Agency',
    price: '$299',
    period: '/mo',
    annual: '$2,988/yr — 2 months free',
    sub: 'Volunteer & small agencies (under 5,000 calls/yr).',
    features: [
      'Up to 1,000 charts / month',
      '5 users',
      'CSV + NEMSIS import',
      'Built-in QA rules',
      'Basic analytics',
      'PDF reports',
      'Email support',
    ],
    note: 'AI reviewer available as an add-on',
    cta: 'Get started',
    href: '/signup?plan=starter',
    highlight: false,
  },
  {
    name: 'Professional',
    price: '$799',
    period: '/mo',
    annual: '$7,988/yr — 2 months free',
    sub: 'Agencies doing 5,000–25,000 calls/yr.',
    features: [
      'Up to 5,000 charts / month',
      '15 users',
      'CSV, NEMSIS & PDF import',
      'Unlimited custom rules',
      'AI reviewer',
      'Policy RAG',
      'Per-provider analytics',
      'Monthly QA reports',
      'SFTP ingestion',
      'Priority support',
    ],
    cta: 'Start with Professional',
    href: '/signup?plan=professional',
    highlight: true,
    badge: 'Most popular',
  },
  {
    name: 'Enterprise',
    price: '$1,999',
    period: '/mo',
    annual: '$19,999/yr — 2 months free',
    sub: 'Large agencies & hospital EMS systems.',
    features: [
      'Up to 20,000 charts / month',
      'Unlimited users',
      'Vendor integrations (ESO, emsCharts, ImageTrend)',
      'AI reviewer + learning loop',
      'Full analytics suite',
      'Executive dashboards',
      'API access',
      'Dedicated onboarding',
      '24-hour support',
    ],
    cta: 'Get started',
    href: '/signup?plan=enterprise',
    highlight: false,
  },
];

// ── Modular products (bundle) ────────────────────────────────────────────────
const MODULES = [
  { name: 'EMS Analytics Suite', price: '$299/mo', desc: 'Dashboards, call-volume & response-time analytics.' },
  { name: 'EMS QA Platform', price: '$799/mo', desc: 'Automated chart review against your protocols.' },
  { name: 'Staffing Forecasting', price: '$299/mo', desc: 'Forecast demand & staffing by day, hour, and location.' },
];

// ── On-prem PHI license by call volume ───────────────────────────────────────
const ONPREM_LICENSE = [
  { calls: 'Under 10,000', price: '$12,000 / yr' },
  { calls: '10,000 – 25,000', price: '$18,000 / yr' },
  { calls: '25,000 – 50,000', price: '$30,000 / yr' },
  { calls: '50,000+', price: '$50,000+ / yr' },
];

// ── Add-ons ──────────────────────────────────────────────────────────────────
const ADDONS = [
  { name: 'AI Reviewer Pack', price: '$99 / mo', desc: 'Additional 1,000 AI-reviewed charts.' },
  { name: 'Additional Storage', price: '$25 / mo', desc: 'Per 100 GB.' },
  { name: 'Additional Agency', price: '$199 / mo', desc: 'Add another agency or tenant.' },
  { name: 'White-Label Branding', price: '$2,500 + $50/mo', desc: 'Your brand, your domain.' },
  { name: 'Custom Protocol Buildout', price: '$1,500–$5,000', desc: 'One-time protocol configuration.' },
  { name: 'Advanced Consulting', price: '$150 / hr', desc: 'Hands-on analytics & QA expertise.' },
];

function Check() {
  return (
    <span
      className="flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 mt-0.5"
      style={{ backgroundColor: 'rgba(14,165,233,0.12)' }}
    >
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="#0EA5E9" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </span>
  );
}

function TierCard({ t }) {
  return (
    <div
      className="flex flex-col rounded-2xl p-6 h-full"
      style={{
        backgroundColor: '#FFFFFF',
        border: t.highlight ? '2px solid #1D4ED8' : '1px solid #E1E8F5',
        boxShadow: t.highlight ? '0 18px 50px rgba(29,78,216,0.16)' : '0 8px 28px rgba(7,24,41,0.06)',
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <h3 className="text-lg font-bold" style={{ color: '#071829' }}>{t.name}</h3>
        {t.badge && (
          <span
            className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider"
            style={
              t.highlight
                ? { backgroundColor: '#1D4ED8', color: '#FFFFFF' }
                : { backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }
            }
          >
            {t.badge}
          </span>
        )}
      </div>

      <div className="flex items-end gap-1 mt-2">
        <span className="text-4xl font-bold" style={{ color: '#071829', letterSpacing: '-0.02em' }}>{t.price}</span>
        {t.period && <span className="text-sm font-medium mb-1" style={{ color: '#64748B' }}>{t.period}</span>}
      </div>
      <p className="text-xs mt-1" style={{ color: '#0EA5E9' }}>{t.annual}</p>

      <p className="text-sm mt-3 leading-relaxed" style={{ color: '#475569' }}>{t.sub}</p>

      <ul className="space-y-2 mt-5 mb-6 flex-1">
        {t.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <Check />
            <span className="text-sm" style={{ color: '#1E293B' }}>{f}</span>
          </li>
        ))}
        {t.note && (
          <li className="text-xs italic pt-1" style={{ color: '#94A3B8' }}>{t.note}</li>
        )}
      </ul>

      {t.external ? (
        <a
          href={t.href}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center px-5 py-3 rounded font-semibold text-sm transition-colors"
          style={
            t.highlight
              ? { backgroundColor: '#1D4ED8', color: '#FFFFFF' }
              : { backgroundColor: '#F1F5F9', color: '#0F2440', border: '1px solid #E1E8F5' }
          }
        >
          {t.cta}
        </a>
      ) : (
        <Link
          href={t.href}
          className="block text-center px-5 py-3 rounded font-semibold text-sm transition-colors"
          style={
            t.highlight
              ? { backgroundColor: '#1D4ED8', color: '#FFFFFF' }
              : { backgroundColor: '#F1F5F9', color: '#0F2440', border: '1px solid #E1E8F5' }
          }
        >
          {t.cta}
        </Link>
      )}
    </div>
  );
}

export default function PricingPage() {
  return (
    <div>
      {/* HERO */}
      <section style={{ background: 'linear-gradient(180deg, #071829 0%, #0D2035 100%)' }}>
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-24">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#0EA5E9' }}>Pricing</p>
            <h1
              className="text-4xl md:text-5xl font-bold mb-6"
              style={{ color: '#FFFFFF', lineHeight: 1.1, letterSpacing: '-0.025em' }}
            >
              One platform for QA, staffing, and operations
            </h1>
            <p className="text-lg mb-10 leading-relaxed" style={{ color: '#94A3B8', maxWidth: '640px' }}>
              QA/QI, staffing forecasts, operational analytics, protocol compliance, and executive
              reporting — in a single platform. Start free, then scale by call volume, in the cloud or on-prem.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href={CALENDAR_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 rounded font-semibold text-base text-center text-white transition-colors"
                style={{ backgroundColor: '#1D4ED8' }}
              >
                Start free trial
              </a>
              <Link
                href="/contact"
                className="px-8 py-4 rounded font-semibold text-base text-center transition-colors"
                style={{ backgroundColor: 'transparent', color: '#E2E8F0', border: '1px solid #1E3A58' }}
              >
                Talk to sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CLOUD TIERS */}
      <section className="py-16 md:py-20" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-4 mb-10">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#0EA5E9' }}>Cloud plans</span>
            <div className="flex-1 h-px" style={{ backgroundColor: '#E1E8F5' }} />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {TIERS.map((t) => <TierCard key={t.name} t={t} />)}
          </div>
          <p className="text-xs mt-6" style={{ color: '#94A3B8' }}>
            Annual billing is 10× the monthly rate — two months free. Charts are billed per month; overage add-ons available.
          </p>
        </div>
      </section>

      {/* PLATFORM BUNDLE */}
      <section className="py-16 md:py-20" style={{ backgroundColor: '#F8FAFD' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#0EA5E9' }}>Best value</p>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#071829', letterSpacing: '-0.02em' }}>
                Full EMS Intelligence Platform
              </h2>
              <p className="text-base leading-relaxed mb-6" style={{ color: '#475569' }}>
                Agencies buy outcomes, not features. Bundle QA/QI, staffing forecasting, predictive
                analytics, and call-volume forecasting into one platform that helps reduce overtime,
                improve compliance, and improve patient care.
              </p>
              <div className="flex items-end gap-2 mb-6">
                <span className="text-4xl font-bold" style={{ color: '#071829' }}>$1,199</span>
                <span className="text-sm font-medium mb-1.5" style={{ color: '#64748B' }}>/mo</span>
                <span className="text-sm mb-1.5 ml-2" style={{ color: '#0EA5E9' }}>everything, one price</span>
              </div>
              <Link
                href="/contact"
                className="inline-block px-7 py-3.5 rounded font-semibold text-sm text-center text-white transition-colors"
                style={{ backgroundColor: '#1D4ED8' }}
              >
                Get the full platform
              </Link>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#64748B' }}>
                Or buy modules individually
              </p>
              {MODULES.map((m) => (
                <div
                  key={m.name}
                  className="flex items-center justify-between gap-4 rounded-xl px-5 py-4"
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid #E1E8F5' }}
                >
                  <div>
                    <p className="text-sm font-bold" style={{ color: '#071829' }}>{m.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{m.desc}</p>
                  </div>
                  <span className="text-sm font-bold whitespace-nowrap" style={{ color: '#1D4ED8' }}>{m.price}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ON-PREM PHI */}
      <section className="py-16 md:py-20" style={{ background: 'linear-gradient(135deg, #071829 0%, #0D2240 50%, #071829 100%)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#0EA5E9' }}>
                On-prem · PHI production
              </p>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                Run it inside your own environment
              </h2>
              <p className="text-base leading-relaxed mb-6" style={{ color: '#94A3B8' }}>
                For agencies and hospital systems that must process PHI in production within their own
                infrastructure. Deployed, configured, and trained by our team — your data never leaves your walls.
              </p>
              <ul className="space-y-2.5 mb-8">
                {['Installation & configuration', 'Protocol setup', 'Initial training', 'Data migration'].map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: 'rgba(14,165,233,0.18)' }}>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="#38BDF8" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span className="text-sm" style={{ color: '#CBD5E1' }}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/contact"
                className="inline-block px-7 py-3.5 rounded font-semibold text-sm text-center text-white transition-colors"
                style={{ backgroundColor: '#1D4ED8' }}
              >
                Request on-prem pricing
              </Link>
            </div>

            <div className="rounded-2xl p-6" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid #1E3A58' }}>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-sm font-semibold" style={{ color: '#E2E8F0' }}>One-time implementation</span>
                <span className="text-lg font-bold" style={{ color: '#FFFFFF' }}>$15k–$30k</span>
              </div>
              <p className="text-xs mb-5" style={{ color: '#64748B' }}>Installation, configuration, protocol setup, training, and data migration.</p>

              <p className="text-sm font-semibold mb-3" style={{ color: '#E2E8F0' }}>Annual license — by call volume</p>
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1E3A58' }}>
                {ONPREM_LICENSE.map((row, i) => (
                  <div
                    key={row.calls}
                    className="flex items-center justify-between px-4 py-3"
                    style={{ backgroundColor: i % 2 ? 'rgba(255,255,255,0.03)' : 'transparent' }}
                  >
                    <span className="text-sm" style={{ color: '#CBD5E1' }}>{row.calls} calls</span>
                    <span className="text-sm font-bold" style={{ color: '#FFFFFF' }}>{row.price}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ADD-ONS */}
      <section className="py-16 md:py-20" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-4 mb-10">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#0EA5E9' }}>Add-ons</span>
            <div className="flex-1 h-px" style={{ backgroundColor: '#E1E8F5' }} />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {ADDONS.map((a) => (
              <div key={a.name} className="rounded-xl p-5" style={{ backgroundColor: '#F8FAFD', border: '1px solid #E1E8F5' }}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-bold" style={{ color: '#071829' }}>{a.name}</p>
                  <span className="text-sm font-bold whitespace-nowrap" style={{ color: '#1D4ED8' }}>{a.price}</span>
                </div>
                <p className="text-xs mt-1.5 leading-relaxed" style={{ color: '#64748B' }}>{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24" style={{ background: 'linear-gradient(135deg, #071829 0%, #0D2240 50%, #071829 100%)' }}>
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-5 mx-auto" style={{ color: '#FFFFFF', maxWidth: '640px', letterSpacing: '-0.02em' }}>
            Not sure which plan fits your agency?
          </h2>
          <p className="text-lg mb-10 mx-auto leading-relaxed" style={{ color: '#94A3B8', maxWidth: '520px' }}>
            Tell us your call volume and goals, and we will recommend the right plan — and demo it with your own data.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={CALENDAR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-10 py-5 rounded font-semibold text-base text-center text-white transition-colors"
              style={{ backgroundColor: '#1D4ED8' }}
            >
              Schedule a demo
            </a>
            <Link
              href="/contact"
              className="px-10 py-5 rounded font-semibold text-base text-center transition-colors"
              style={{ backgroundColor: 'transparent', color: '#E2E8F0', border: '1px solid #1E3A58' }}
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
