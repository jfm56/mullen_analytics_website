import Link from 'next/link';
import {
  BarChart3, BrainCircuit, Zap, Check, ShieldCheck, Siren, BadgeCheck, Lock,
} from 'lucide-react';

// Healthcare vertical page. Same FIXED palette as the home page — see
// app/page.jsx. Focused on hospitals / health systems / clinical operations.

const CALENDAR_URL = 'https://calendar.app.google/1BFgdi2pgjF9vwAB8';

const TRUST_PILLARS = [
  { Icon: ShieldCheck, label: 'Veteran-Owned & Operated' },
  { Icon: Siren,       label: 'Former First Responders' },
  { Icon: BadgeCheck,  label: 'Explainable Results You Can Trust' },
  { Icon: Lock,        label: 'HIPAA-Aware & Secure' },
];

const VALUE_POINTS = [
  'Better patient outcomes',
  'Less operational waste',
  'Clearer leadership reporting',
  'Lower documentation burden',
];

const SERVICES = [
  {
    Icon: BarChart3,
    title: 'Operational Analytics',
    desc: 'See how your organization actually runs — patient flow, staffing, length of stay, readmissions, and utilization — in dashboards leadership can act on.',
    tags: ['Patient flow', 'Staffing analysis', 'LOS & readmissions', 'Utilization', 'Executive dashboards'],
  },
  {
    Icon: BrainCircuit,
    title: 'Predictive Modeling',
    desc: 'Get ahead of demand — forecast census, staffing needs, and surges, and flag patient risk early, all from your own data.',
    tags: ['Census forecasting', 'Surge forecasting', 'Staffing prediction', 'Patient risk'],
  },
  {
    Icon: Zap,
    title: 'Automation & Decision Support',
    desc: 'Cut the paperwork — documentation automation, automated summaries, QA/QI workflows, and compliance reporting that frees clinicians for care.',
    tags: ['Documentation automation', 'Automated summaries', 'QA/QI workflows', 'Compliance support'],
  },
];

const IMPROVEMENTS = [
  'Improved patient outcomes',
  'Better staffing decisions',
  'Less operational waste',
  'Shorter patient wait times',
  'Stronger compliance reporting',
  'Better financial visibility',
  'Clearer leadership reporting',
  'Less manual admin work',
  'Better executive decisions',
  'Higher system-wide efficiency',
];

export const metadata = {
  title: 'Healthcare Analytics & Predictive Operations | Mullen Analytics',
  description:
    'Healthcare analytics: forecast demand, improve staffing, analyze patient flow and length of stay, reduce readmissions, and automate reporting with clinical accountability.',
};

export default function HealthcarePage() {
  return (
    <div className="bg-white">

      {/* HERO — navy band */}
      <section className="bg-navy-deep">
        <div className="max-w-7xl mx-auto px-6 py-24 md:py-28">
          <div className="max-w-3xl mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-400 mb-5">Healthcare</p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-6">
              Better care, smarter operations
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed max-w-2xl">
              For hospitals, health systems, and clinical operations teams, we turn your data into better
              patient flow, smarter staffing, and decisions leadership can stand behind — without adding
              to the charting burden.
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
                Where staffing, flow, and outcomes all connect
              </h2>
              <div className="space-y-5">
                <p className="text-base text-slate-700 leading-relaxed">
                  In healthcare, staffing, patient flow, compliance, and clinical outcomes are all tied
                  together — and they affect both the care you deliver and the bottom line.
                </p>
                <p className="text-base text-slate-700 leading-relaxed">
                  Good analytics turns your operational data into faster decisions, stronger systems, and
                  measurable improvements across the organization.
                </p>
                <p className="text-base text-slate-700 leading-relaxed">
                  It is not about replacing clinicians. It is about giving leadership better tools to
                  improve care, cut waste, and strengthen performance over time.
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
              Three ways we help your organization
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {SERVICES.map(({ Icon, title, desc, tags }) => (
              <div key={title} className="bg-white border border-slate-200 rounded-xl p-7 shadow-sm">
                <div className="w-11 h-11 rounded-lg bg-blue-600/10 flex items-center justify-center mb-4">
                  <Icon size={20} strokeWidth={1.75} className="text-blue-700" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-700 leading-relaxed mb-5">{desc}</p>
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
            Better healthcare decisions start with better data
          </h2>
          <p className="text-lg text-slate-300 mb-12 leading-relaxed mx-auto max-w-xl">
            If your organization is ready to improve operations, cut waste, and strengthen patient
            outcomes, let&apos;s talk.
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
