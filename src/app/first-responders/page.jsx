import Link from 'next/link';
import {
  BarChart3, BrainCircuit, Zap, Check, ShieldCheck, Siren, BadgeCheck, Lock,
} from 'lucide-react';

// First Responders vertical page. Same FIXED palette as the home page — see
// app/page.jsx. Focused on EMS / fire / public safety (their core strength).

const CALENDAR_URL = 'https://calendar.app.google/1BFgdi2pgjF9vwAB8';

const TRUST_PILLARS = [
  { Icon: ShieldCheck, label: 'Veteran-Owned & Operated' },
  { Icon: Siren,       label: 'Former First Responders' },
  { Icon: BadgeCheck,  label: 'Explainable Results You Can Trust' },
  { Icon: Lock,        label: 'Security & Compliance Focused' },
];

const VALUE_POINTS = [
  'Run data turned into action',
  'Defensible decisions under pressure',
  'Forecasting that strengthens response',
  'Accountability leadership can trust',
];

const SERVICES = [
  {
    Icon: BarChart3,
    title: 'Operational Analytics',
    desc: 'See how your agency actually runs — response times, unit use, deployment, overtime, and staffing — in dashboards built around your operations.',
    tags: ['Response time analysis', 'Unit utilization', 'Staffing analysis', 'Leadership dashboards'],
  },
  {
    Icon: BrainCircuit,
    title: 'Predictive Modeling',
    desc: 'Get ahead of demand — forecast call volume, plan staffing, spot incident patterns, and deploy proactively, all based on your own history.',
    tags: ['Demand forecasting', 'Staffing prediction', 'Incident patterns', 'Proactive deployment'],
  },
  {
    Icon: Zap,
    title: 'Automation & Decision Support',
    desc: 'Cut the paperwork — automated reporting, incident summaries, QA/QI support, scheduling help, and compliance documentation.',
    tags: ['Automated reporting', 'QA/QI support', 'Compliance workflows', 'Documentation'],
  },
];

const IMPROVEMENTS = [
  'Faster response times',
  'Better staffing decisions',
  'Lower overtime costs',
  'Improved patient outcomes',
  'Less administrative burden',
  'Stronger compliance reporting',
  'Better budget justification',
  'Grant & funding justification',
  'Greater public trust',
  'Leadership-ready decisions',
];

export const metadata = {
  title: 'EMS Consulting Services & Analytics | Mullen Analytics',
  description:
    'EMS analytics and consulting for agencies improving response times, staffing, deployment, QA/QI, reporting, and operational performance — call-volume forecasting, unit utilization, and leadership-ready dashboards for EMS, fire, and public safety.',
};

export default function FirstRespondersPage() {
  return (
    <div className="bg-white">

      {/* HERO — navy band */}
      <section className="bg-navy-deep">
        <div className="max-w-7xl mx-auto px-6 py-24 md:py-28">
          <div className="max-w-3xl mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-400 mb-5">EMS · Fire · Public Safety</p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-4">
              EMS Analytics &amp; Consulting Services
            </h1>
            <p className="text-xl md:text-2xl text-sky-300 font-semibold leading-snug mb-6 max-w-2xl">
              Better decisions when seconds count.
            </p>
            <p className="text-lg text-slate-300 leading-relaxed max-w-2xl">
              Analytics and consulting for EMS agencies looking to improve response times, staffing,
              deployment, QA/QI, reporting, and operational performance.
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
            <a href="#services"
              className="px-8 py-4 rounded border border-navy-border hover:border-slate-500 text-slate-200 hover:text-white font-semibold text-base text-center transition-colors">
              See what we build
            </a>
          </div>
        </div>
      </section>

      {/* WHY IT MATTERS — white */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-4">Why It Matters</p>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-6">
                Where seconds matter and every call counts
              </h2>
              <div className="space-y-5">
                <p className="text-base text-slate-600 leading-relaxed">
                  First responders work where seconds matter, resources are tight, and every decision
                  carries real weight.
                </p>
                <p className="text-base text-slate-600 leading-relaxed">
                  Good analytics turns your run data into faster, smarter, more defensible decisions —
                  without ever replacing the judgment of the people making the call.
                </p>
                <p className="text-base text-slate-600 leading-relaxed">
                  It is about giving leadership better tools to protect lives, use resources well, and
                  serve the community.
                </p>
              </div>
            </div>
            <div className="grid gap-3 lg:mt-4">
              {VALUE_POINTS.map((item) => (
                <div key={item} className="flex items-center gap-3 px-5 py-4 rounded-xl bg-slate-50 border border-slate-200">
                  <Check size={16} strokeWidth={2.5} className="text-blue-700 flex-shrink-0" />
                  <span className="text-sm font-medium text-slate-700">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* WHAT WE BUILD — slate-50 */}
      <section id="services" className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-4">What We Build</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">
              Three ways we help your agency
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {SERVICES.map(({ Icon, title, desc, tags }) => (
              <div key={title} className="bg-white border border-slate-200 rounded-xl p-7 shadow-sm">
                <div className="w-11 h-11 rounded-lg bg-blue-600/10 flex items-center justify-center mb-4">
                  <Icon size={20} strokeWidth={1.75} className="text-blue-700" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-5">{desc}</p>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span key={tag} className="text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1">{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT THIS IMPROVES — white */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-4">The Payoff</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">
              What it adds up to
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {IMPROVEMENTS.map((item) => (
              <div key={item} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-50 border border-slate-200">
                <Check size={15} strokeWidth={2.5} className="text-blue-700 flex-shrink-0" />
                <span className="text-sm font-medium text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA — navy band */}
      <section className="py-28 bg-navy-deep">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight mb-6">
            Better decisions start with better data
          </h2>
          <p className="text-lg text-slate-300 mb-12 leading-relaxed mx-auto max-w-xl">
            If your agency is ready to respond faster, staff smarter, and make decisions you can stand
            behind, let&apos;s talk.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact"
              className="px-10 py-5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base text-center transition-colors">
              Start a Conversation
            </Link>
            <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer"
              className="px-10 py-5 rounded border border-navy-border hover:border-slate-500 text-slate-200 hover:text-white font-semibold text-base text-center transition-colors">
              Schedule a Strategy Call
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
