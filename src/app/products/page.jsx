import Link from 'next/link';

export const metadata = {
  title: 'Products | Mullen Analytics & AI Consulting',
  description:
    'Explore Mullen Analytics products: EMS Analytics Dashboards, the EMS QA/QI Platform, and the secure Client Portal — built for public safety and healthcare organizations.',
};

const CALENDAR_URL = 'https://calendar.app.google/1BFgdi2pgjF9vwAB8';

const PRODUCTS = [
  // ── EMS & Public Safety ──────────────────────────────────────────────────
  {
    category: 'EMS & Public Safety',
    eyebrow: 'EMS Analytics',
    name: 'EMS Analytics Dashboard',
    status: 'available',
    desc: 'Upload your EMSCharts, ESO, or ImageTrend CSV exports and get clean, leadership-ready dashboards in minutes — call volume, response times, unit performance, data-quality checks, and year-over-year comparisons.',
    features: [
      'EMSCharts / ESO / ImageTrend CSV upload & automated cleaning',
      'Call volume & response-time analytics',
      'Unit performance & data-quality reports',
      'Year-over-year comparison dashboards',
      'Leadership-ready exports (PDF / PNG)',
    ],
    image: '/products/ems-dashboard.png',
    href: CALENDAR_URL,
    cta: 'See it with your data',
    external: true,
  },
  {
    category: 'EMS & Public Safety',
    eyebrow: 'Quality Assurance',
    name: 'EMS QA/QI Platform',
    status: 'early-access',
    desc: 'Multi-tenant SaaS that reviews ePCR exports against your agency\'s standing orders and policies — flagging documentation gaps, protocol deviations, and compliance issues before they become audit findings. HIPAA-focused, on-prem-ready, built by former first responders.',
    features: [
      'NEMSIS / EMSCharts / ESO / ImageTrend import pipeline',
      'Automated chart review against agency policies & standing orders',
      'Missing-documentation & protocol-deviation flags',
      'Manager review workflow with audit-log hash chain',
      'HIPAA-compliant · RBAC · on-prem deployment path',
      'TOTP MFA · Row-Level Security · tamper-evident audit logs',
    ],
    image: null,
    href: '/contact',
    cta: 'Request early access',
    badge: 'HIPAA-focused',
  },
  {
    category: 'EMS & Public Safety',
    eyebrow: 'Client Portal',
    name: 'Secure Client Portal',
    status: 'available',
    desc: 'A private workspace for your agency: upload data, explore datasets, view dashboards, download reports, submit recommendations, and message our team — with role-based access and per-client data isolation.',
    features: [
      'Secure, per-client data isolation (Row-Level Security)',
      'Self-service uploads & interactive dashboards',
      'Reports, invoices & secure messaging',
      'Recommendations & issue tracking',
    ],
    image: '/products/client-portal.png',
    href: '/portal/login',
    cta: 'Open the portal',
  },

  // ── Coming soon ──────────────────────────────────────────────────────────
  {
    category: 'Coming Soon',
    eyebrow: 'Prediction',
    name: 'EMS Predictive Analytics',
    status: 'coming-soon',
    desc: 'Forecast call volume, staffing needs, and response-time risk — by day, hour, and location, with historical weather built in. Plan coverage before demand hits.',
    features: [
      'Call-volume & staffing forecasts',
      'Response-time risk alerts',
      'Geographic demand forecasting',
      'Weather-aware trend modeling',
    ],
    image: '/products/predictive-analytics.png',
    href: '/contact',
    cta: 'Join the early-access list',
  },
];

// ── Group products by category ───────────────────────────────────────────────
const CATEGORIES = [...new Set(PRODUCTS.map((p) => p.category))];

function StatusBadge({ status }) {
  const styles = {
    available:    { bg: '#ECFDF5', color: '#047857', border: '#A7F3D0', dot: '#10B981', label: 'Available now' },
    'early-access': { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', dot: '#3B82F6', label: 'Early access' },
    beta:         { bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE', dot: '#7C3AED', label: 'Beta' },
    'coming-soon': { bg: '#FEF9F0', color: '#B45309', border: '#F5E0B8', dot: '#F59E0B', label: 'Coming soon' },
  };
  const s = styles[status] ?? styles['coming-soon'];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider"
      style={{ backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.dot }} />
      {s.label}
    </span>
  );
}

function BrowserFrame({ image, alt, label }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E1E8F5', boxShadow: '0 12px 40px rgba(7,24,41,0.14)' }}>
      <div className="flex items-center gap-2 px-3 py-2.5" style={{ backgroundColor: '#0D2035' }}>
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#FF5F57' }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#FEBC2E' }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#28C840' }} />
        <span className="ml-3 flex-1 truncate rounded px-2 py-0.5 text-[11px]" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#94A3B8' }}>
          app.mullenanalytics.com
        </span>
      </div>
      {image ? (
        <img src={image} alt={alt} className="w-full block" style={{ maxHeight: '460px', objectFit: 'cover', objectPosition: 'top' }} />
      ) : (
        <div className="flex flex-col items-center justify-center text-center px-6"
          style={{ aspectRatio: '16 / 10', background: 'linear-gradient(135deg, #F8FAFD 0%, #EEF3FB 100%)' }}>
          <svg className="w-10 h-10 mb-3" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 2L3 14h7l-1 8 11-12h-7l1-8z" />
          </svg>
          <p className="text-sm font-semibold" style={{ color: '#071829' }}>{label}</p>
          <p className="text-xs mt-1" style={{ color: '#64748B' }}>Preview coming soon — contact us for a demo.</p>
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <div>
      {/* HERO */}
      <section style={{ background: 'linear-gradient(180deg, #071829 0%, #0D2035 100%)' }}>
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#0EA5E9' }}>Products</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-6"
              style={{ color: '#FFFFFF', lineHeight: 1.1, letterSpacing: '-0.025em' }}>
              Analytics &amp; AI tools built for real decisions
            </h1>
            <p className="text-lg mb-10 leading-relaxed" style={{ color: '#94A3B8', maxWidth: '640px' }}>
              From dashboards to automated QA and forecasting — purpose-built EMS &amp; healthcare tools that surface the right information at the right time, with full auditability and no black boxes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer"
                className="px-8 py-4 rounded font-semibold text-base text-center text-white transition-colors"
                style={{ backgroundColor: '#1D4ED8' }}>
                Schedule a demo
              </a>
              <Link href="/portal/login"
                className="px-8 py-4 rounded font-semibold text-base text-center transition-colors"
                style={{ backgroundColor: 'transparent', color: '#E2E8F0', border: '1px solid #1E3A58' }}>
                Open the client portal
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCT SECTIONS — grouped by category */}
      {CATEGORIES.map((category) => {
        const catProducts = PRODUCTS.filter((p) => p.category === category);
        return (
          <div key={category}>
            {/* Category divider */}
            <div className="max-w-7xl mx-auto px-6 pt-16 pb-2">
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#0EA5E9' }}>{category}</span>
                <div className="flex-1 h-px" style={{ backgroundColor: '#E1E8F5' }} />
              </div>
            </div>

            {catProducts.map((p, i) => {
              const reversed = i % 2 === 1;
              const tinted   = i % 2 === 1;
              return (
                <section key={p.name} className="py-16 md:py-20"
                  style={{ backgroundColor: tinted ? '#F8FAFD' : '#FFFFFF' }}>
                  <div className="max-w-7xl mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

                      {/* Screenshot / mockup */}
                      <div className={reversed ? 'lg:order-2' : ''}>
                        <BrowserFrame image={p.image} alt={`${p.name} screenshot`} label={p.name} />
                      </div>

                      {/* Copy */}
                      <div className={reversed ? 'lg:order-1' : ''}>
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#0EA5E9' }}>
                            {p.eyebrow}
                          </p>
                          <StatusBadge status={p.status} />
                          {p.badge && (
                            <span className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                              style={{ backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}>
                              {p.badge}
                            </span>
                          )}
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold mb-4"
                          style={{ color: '#071829', letterSpacing: '-0.02em' }}>{p.name}</h2>
                        <p className="text-base leading-relaxed mb-6" style={{ color: '#475569' }}>{p.desc}</p>

                        <ul className="space-y-2.5 mb-8">
                          {p.features.map((f) => (
                            <li key={f} className="flex items-start gap-3">
                              <span className="flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 mt-0.5"
                                style={{ backgroundColor: 'rgba(14,165,233,0.12)' }}>
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="#0EA5E9" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </span>
                              <span className="text-sm" style={{ color: '#1E293B' }}>{f}</span>
                            </li>
                          ))}
                        </ul>

                        {p.external ? (
                          <a href={p.href} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-semibold"
                            style={{ color: '#1D4ED8' }}>
                            {p.cta} <span aria-hidden>→</span>
                          </a>
                        ) : (
                          <Link href={p.href}
                            className="inline-flex items-center gap-2 text-sm font-semibold"
                            style={{ color: '#1D4ED8' }}>
                            {p.cta} <span aria-hidden>→</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        );
      })}

      {/* FINAL CTA */}
      <section className="py-24" style={{ background: 'linear-gradient(135deg, #071829 0%, #0D2240 50%, #071829 100%)' }}>
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-5 mx-auto"
            style={{ color: '#FFFFFF', maxWidth: '640px', letterSpacing: '-0.02em' }}>
            Want a walkthrough with your own data?
          </h2>
          <p className="text-lg mb-10 mx-auto leading-relaxed" style={{ color: '#94A3B8', maxWidth: '520px' }}>
            We&rsquo;ll demo any product with your agency&rsquo;s real data, loaded into a live dashboard you can click through.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer"
              className="px-10 py-5 rounded font-semibold text-base text-center text-white transition-colors"
              style={{ backgroundColor: '#1D4ED8' }}>
              Schedule a demo
            </a>
            <Link href="/contact"
              className="px-10 py-5 rounded font-semibold text-base text-center transition-colors"
              style={{ backgroundColor: 'transparent', color: '#E2E8F0', border: '1px solid #1E3A58' }}>
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
