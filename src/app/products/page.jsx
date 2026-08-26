import Link from 'next/link';
import {
  BarChart3, Cloud, BrainCircuit, Zap, Compass, Check, ArrowRight,
} from 'lucide-react';

// Products & Solutions. Same FIXED palette as the home page — see app/page.jsx.
// Broad "Solutions we build" grid up top, then the EMS SaaS "Platforms" below.

export const metadata = {
  title: 'Products & Solutions | Mullen Analytics & Data Solutions',
  description:
    'Custom analytics & dashboards, AWS data engineering, machine learning, and automation — plus ready-to-use platforms like EMS Analytics, the EMS QA/QI Platform, and the secure Client Portal.',
};

const CALENDAR_URL = 'https://calendar.app.google/1BFgdi2pgjF9vwAB8';

const SOLUTIONS = [
  { Icon: BarChart3,    title: 'Custom Analytics & Dashboards', desc: 'Dashboards and reports built around your data and your decisions — clear views your team will actually use.' },
  { Icon: Cloud,        title: 'AWS Data Engineering',          desc: 'Modern, secure data pipelines and warehouses on AWS — so your data is reliable, current, and ready to use.' },
  { Icon: BrainCircuit, title: 'Machine Learning & Automation', desc: 'Forecasting, prediction, and automation — built to be explainable, so you can defend the output.' },
  { Icon: Zap,          title: 'Automation & Decision Support', desc: 'Automate manual reporting, document processing, and repetitive workflows — accurately and consistently.' },
  { Icon: Compass,      title: 'Data Strategy & Advisory',      desc: 'Not sure where to start? We help you find the highest-value opportunities and a practical roadmap.' },
];

const PLATFORMS = [
  {
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
    eyebrow: 'Quality Assurance',
    name: 'EMS QA/QI Platform',
    status: 'early-access',
    desc: 'Multi-tenant SaaS that reviews ePCR exports against your agency\'s standing orders and policies — flagging documentation gaps, protocol deviations, and compliance issues before they become audit findings. HIPAA-focused, on-prem-ready, built by former first responders.',
    features: [
      'NEMSIS / EMSCharts / ESO / ImageTrend import pipeline',
      'Automated chart review against agency policies & standing orders',
      'Missing-documentation & protocol-deviation flags',
      'Manager review workflow with audit-log hash chain',
      'HIPAA-focused · RBAC · on-prem deployment path',
    ],
    image: null,
    href: '/ems-qa',
    cta: 'Explore the platform',
    badge: 'HIPAA-focused',
  },
  {
    eyebrow: 'Client Portal',
    name: 'Secure Client Portal',
    status: 'available',
    desc: 'A private workspace for your organization: upload data, explore datasets, view dashboards, download reports, submit recommendations, and message our team — with role-based access and per-client data isolation.',
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
  {
    eyebrow: 'Prediction',
    name: 'EMS Predictive Analytics',
    status: 'available',
    desc: 'Forecast call volume, staffing needs, and response-time risk — by day, hour, and location, with historical weather built in. Plan coverage before demand hits.',
    features: [
      'Call-volume & staffing forecasts',
      'Response-time risk alerts',
      'Geographic demand forecasting',
      'Weather-aware trend modeling',
    ],
    image: '/products/predictive-analytics.png',
    href: CALENDAR_URL,
    cta: 'See it with your data',
    external: true,
  },
];

const STATUS = {
  available:      { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Available now' },
  'early-access': { cls: 'bg-blue-50 text-blue-700 border-blue-200',          dot: 'bg-blue-500',    label: 'Early access' },
  beta:           { cls: 'bg-violet-50 text-violet-700 border-violet-200',    dot: 'bg-violet-500',  label: 'Beta' },
  'coming-soon':  { cls: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-500',   label: 'Coming soon' },
};

function StatusBadge({ status }) {
  const s = STATUS[status] ?? STATUS['coming-soon'];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider border ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export default function ProductsPage() {
  return (
    <div className="bg-white">

      {/* HERO — navy band */}
      <section className="bg-navy-deep">
        <div className="max-w-7xl mx-auto px-6 py-24 md:py-28">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-400 mb-5">Products &amp; Solutions</p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-6">
              Analytics &amp; automation built for real decisions
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed max-w-2xl mb-10">
              From custom analytics and data engineering to ready-to-use platforms — we
              build the tools that turn your data into decisions, whatever your field.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer"
                className="px-8 py-4 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base text-center transition-colors">
                Schedule a demo
              </a>
              <Link href="/portal/login"
                className="px-8 py-4 rounded border border-navy-border hover:border-slate-500 text-slate-200 hover:text-white font-semibold text-base text-center transition-colors">
                Open the client portal
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SOLUTIONS — white */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-4">Solutions We Build</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-4">
              Custom-built for your data and your goals
            </h2>
            <p className="text-base text-slate-700 leading-relaxed">
              Every organization is different, so most of what we deliver is built for you — from the
              data foundation up to the dashboards and models on top.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SOLUTIONS.map(({ Icon, title, desc }) => (
              <div key={title} className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <div className="w-11 h-11 rounded-lg bg-blue-600/10 flex items-center justify-center mb-4">
                  <Icon size={20} strokeWidth={1.75} className="text-blue-700" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLATFORMS — card grid */}
      <section className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-4">Platforms</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-4">
              Ready-to-use software
            </h2>
            <p className="text-base text-slate-700 leading-relaxed">
              Purpose-built platforms for EMS and public-safety agencies — available today, with full
              auditability and no black boxes.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {PLATFORMS.map((p) => (
              <div key={p.name} className="bg-white border border-slate-200 rounded-xl p-7 shadow-sm flex flex-col">
                <div className="flex flex-wrap items-center gap-2.5 mb-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-sky-600">{p.eyebrow}</p>
                  <StatusBadge status={p.status} />
                  {p.badge && (
                    <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                      {p.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-2">{p.name}</h3>
                <p className="text-sm text-slate-700 leading-relaxed mb-5">{p.desc}</p>
                <ul className="space-y-2.5 mb-6 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 mt-0.5 bg-blue-600/10">
                        <Check size={13} strokeWidth={3} className="text-blue-700" />
                      </span>
                      <span className="text-sm text-slate-700">{f}</span>
                    </li>
                  ))}
                </ul>
                {p.external ? (
                  <a href={p.href} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800">
                    {p.cta} <ArrowRight size={15} />
                  </a>
                ) : (
                  <Link href={p.href}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800">
                    {p.cta} <ArrowRight size={15} />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA — navy band */}
      <section className="py-24 bg-navy-deep">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-5">
            Want a walkthrough with your own data?
          </h2>
          <p className="text-lg text-slate-300 mb-10 leading-relaxed mx-auto max-w-xl">
            Tell us what you&apos;re trying to solve and we&apos;ll show you what it looks like with your data —
            a custom solution or a live platform you can click through.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer"
              className="px-10 py-5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base text-center transition-colors">
              Schedule a demo
            </a>
            <Link href="/contact"
              className="px-10 py-5 rounded border border-navy-border hover:border-slate-500 text-slate-200 hover:text-white font-semibold text-base text-center transition-colors">
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
