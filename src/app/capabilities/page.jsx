import Link from 'next/link';
import {
  BarChart3, BrainCircuit, FlaskConical, Database, Check, ArrowRight,
  ShieldCheck, Users, BadgeCheck, Lock,
} from 'lucide-react';
import { JOURNEY } from '@/data/journey';

// Capabilities uses the same FIXED palette as the home page (always light, with
// navy bands). Organized by what we DO (four disciplines that apply to any
// field), then how that maps to each vertical — see app/page.jsx.

const CALENDAR_URL = 'https://calendar.app.google/4JuyKX7s75GmJT5u9';

const TRUST_PILLARS = [
  { Icon: ShieldCheck, label: 'Veteran-Owned & Operated' },
  { Icon: Users,       label: 'Real-World Operational Experience' },
  { Icon: BadgeCheck,  label: 'Explainable Results You Can Trust' },
  { Icon: Lock,        label: 'Security & Compliance Focused' },
];

const CAPABILITIES = [
  {
    Icon: BarChart3,
    title: 'Analytics & Dashboards',
    desc: 'Clear, at-a-glance views of how your organization is doing — the numbers that matter, in one place, easy to see and act on.',
    points: ['Executive dashboards', 'KPI design & reporting', 'Performance analysis', 'Operational insights'],
  },
  {
    Icon: BrainCircuit,
    title: 'Machine Learning & Automation',
    desc: 'Software that learns from your data to forecast what is coming, flag what matters, and handle repetitive work — built so you can see how it reached its answer.',
    points: ['Forecasting & prediction', 'Explainable Results', 'Automation', 'Anomaly & risk detection'],
  },
  {
    Icon: FlaskConical,
    title: 'Data Science',
    desc: 'Digging into your data to answer the real questions: why something is happening, what is likely next, and what to do about it.',
    points: ['Statistical analysis', 'Predictive modeling', 'Experiments & testing', 'Model validation'],
  },
  {
    Icon: Database,
    title: 'Data Engineering & Platforms',
    desc: 'Gathering your data from wherever it lives, cleaning it up, and keeping it in one reliable, secure place — the foundation everything else runs on.',
    points: ['Data pipelines', 'Warehouses & integrations', 'Secure, modern platforms', 'Data quality & validation'],
  },
];

const VERTICALS = [
  { label: 'Business & Commercial', href: '/industries',          examples: 'Demand and revenue forecasting, customer churn and retention, operations analytics, KPI dashboards.' },
  { label: 'First Responders',      href: '/first-responders',    examples: 'Demand forecasting, staffing and deployment, response-time analysis.' },
  { label: 'Healthcare',            href: '/healthcare',          examples: 'Patient flow, quality improvement, clinical and operational analytics.' },
  { label: 'Biomedical Research',   href: '/biomedical-research', examples: 'Cohort analysis, outcome modeling, trial performance and data quality.' },
];

const ENGAGEMENT = [
  'Project-based work',
  'Ongoing advisory (retainer)',
  'Long-term partnerships',
  'Staff augmentation',
  'Embedded analytics leadership',
  'Change management & training',
];

const TRUST_CARDS = [
  { title: 'Security & compliance', desc: 'Data protection and security built into every engagement.' },
  { title: 'Explainable by design', desc: 'Models you can audit, document, and defend.' },
  { title: 'You own the result', desc: 'Deliverables set up for you to keep, transfer, and build on.' },
  { title: 'Careful with sensitive data', desc: 'Clear protocols for regulated and protected information.' },
  { title: 'Built to scale', desc: 'Systems designed for growth, change, and the long haul.' },
  { title: 'Flexible engagements', desc: 'Pilots, phased rollouts, retainers, or multi-year programs.' },
];

export const metadata = {
  title: 'Analytics, ML & Data Engineering Capabilities | Mullen Analytics',
  description:
    'What we do: analytics and dashboards, machine learning and automation, data science, and data engineering — explainable, defensible, and built to be used.',
};

export default function CapabilitiesPage() {
  return (
    <div className="bg-white">

      {/* HERO — navy band */}
      <section className="bg-navy-deep">
        <div className="max-w-7xl mx-auto px-6 py-24 md:py-28">
          <div className="max-w-3xl mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-400 mb-5">Capabilities</p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-6">
              From raw data to decisions you can trust
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed max-w-2xl">
              We handle the whole journey — organizing your data, making sense of it, and turning it into
              clear answers — for businesses, public safety, healthcare, and research.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-navy-border pt-10 max-w-4xl">
            {TRUST_PILLARS.map(({ Icon, label }) => (
              <div key={label} className="flex flex-col items-start gap-2.5">
                <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center">
                  <Icon size={20} strokeWidth={1.75} className="text-sky-400" />
                </div>
                <p className="text-xs font-semibold text-slate-300 leading-snug">{label}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-4 mt-12">
            <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer"
              className="px-8 py-4 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base text-center transition-colors">
              Schedule a Strategy Call
            </a>
            <a href="#capabilities"
              className="px-8 py-4 rounded border border-navy-border hover:border-slate-500 text-slate-200 hover:text-white font-semibold text-base text-center transition-colors">
              See what we do
            </a>
          </div>
        </div>
      </section>

      {/* END-TO-END PATH — the connected journey these capabilities move you along */}
      <section className="py-24 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-3">End to end</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">One connected path — from data to decisions</h2>
            <p className="text-base text-slate-600 leading-relaxed">
              These aren&apos;t a menu of one-off services. They&apos;re steps on a single path: we take you from the
              raw data you already collect to a system your own team runs. Start anywhere — most clients start with
              a free assessment.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-9">
            {JOURNEY.map(({ step, title, desc }) => (
              <div key={step} className="border-l-2 border-slate-200 pl-5">
                <div className="flex items-baseline gap-2.5 mb-2">
                  <span className="text-xl font-black text-blue-600 tabular-nums">{step}</span>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">{title}</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CORE CAPABILITIES — white */}
      <section id="capabilities" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-4">What We Do</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-4">
              Four things we do — end to end
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              From getting your data organized and trustworthy, to turning it into answers your team can
              act on. Every one of these applies whatever your field.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {CAPABILITIES.map(({ Icon, title, desc, points }) => (
              <div key={title} className="bg-slate-50 border border-slate-200 rounded-xl p-7">
                <div className="w-11 h-11 rounded-lg bg-blue-600/10 flex items-center justify-center mb-4">
                  <Icon size={20} strokeWidth={1.75} className="text-blue-700" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-5">{desc}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                  {points.map((pt) => (
                    <div key={pt} className="flex items-center gap-2">
                      <Check size={14} strokeWidth={2.5} className="text-blue-700 flex-shrink-0" />
                      <span className="text-xs font-medium text-slate-700">{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* APPLIED ACROSS YOUR FIELD — slate-50 */}
      <section className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-4">Where We Apply It</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-4">
              The same rigor, in your world
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              The disciplines are the same everywhere — what changes is the problem. Here is what that
              looks like across the fields we work in.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {VERTICALS.map((v) => (
              <Link key={v.href} href={v.href}
                className="group bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-blue-500 transition-all">
                <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                  {v.label}
                  <ArrowRight size={15} className="text-blue-700 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">{v.examples}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* HOW WE WORK — white */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-4">How We Work</p>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-6">
                Built around your team and your goals
              </h2>
              <p className="text-base text-slate-600 leading-relaxed mb-4">
                Every engagement is collaborative and scoped to fit — your timeline, your data, and how
                much of the work you want to own versus hand off.
              </p>
              <p className="text-base text-slate-600 leading-relaxed">
                Pricing is tied to the value we deliver, not hours on a clock.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {ENGAGEMENT.map((item) => (
                <div key={item} className="flex items-center gap-3 px-4 py-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <Check size={15} strokeWidth={2.5} className="text-blue-700 flex-shrink-0" />
                  <span className="text-sm font-medium text-slate-700">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* BUILT TO BE TRUSTED — slate-50 */}
      <section className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-4">Built to Be Trusted</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-4">
              Ready for procurement, audits, and the long term
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              We work comfortably with enterprise and public-sector procurement, RFPs, and multi-year
              contracts — and everything we build is made to hold up to review.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TRUST_CARDS.map((card) => (
              <div key={card.title} className="bg-white border border-slate-200 border-t-[3px] border-t-blue-600 rounded-xl p-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 mb-2">{card.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA — navy band */}
      <section className="py-28 bg-navy-deep">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight mb-6">
            Ready to move forward?
          </h2>
          <p className="text-lg text-slate-300 mb-12 leading-relaxed mx-auto max-w-xl">
            If you want to improve operations, make sharper decisions, and get more from the data you
            already have, we would welcome the conversation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer"
              className="px-10 py-5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base text-center transition-colors">
              Schedule a Call
            </a>
            <Link href="/portfolio"
              className="px-10 py-5 rounded border border-navy-border hover:border-slate-500 text-slate-200 hover:text-white font-semibold text-base text-center transition-colors">
              Explore Our Work
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
