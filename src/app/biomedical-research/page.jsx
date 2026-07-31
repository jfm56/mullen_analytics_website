import Link from 'next/link';
import {
  BarChart3, BrainCircuit, Zap, Check, ShieldCheck, BadgeCheck, ClipboardCheck, Lock,
} from 'lucide-react';

// Biomedical Research vertical page. Same FIXED palette as the home page — see
// app/page.jsx. Focused on research institutions / clinical trials / life sciences.

const CALENDAR_URL = 'https://calendar.app.google/1BFgdi2pgjF9vwAB8';

const TRUST_PILLARS = [
  { Icon: ShieldCheck,    label: 'Veteran-Owned & Operated' },
  { Icon: BadgeCheck,     label: 'Explainable Results You Can Trust' },
  { Icon: ClipboardCheck, label: 'Regulatory-Aware (GCP · FDA · IRB)' },
  { Icon: Lock,           label: 'Secure & Compliant' },
];

const VALUE_POINTS = [
  'Faster discovery',
  'Less reporting burden',
  'Real-time trial visibility',
  'Stronger data quality',
];

const SERVICES = [
  {
    Icon: BarChart3,
    title: 'Research Analytics',
    desc: 'Full visibility into your studies — trial dashboards, biomarker tracking, protocol monitoring, and research performance reporting.',
    tags: ['Clinical trial dashboards', 'Biomarker tracking', 'Protocol monitoring', 'Performance reporting', 'Longitudinal analysis'],
  },
  {
    Icon: BrainCircuit,
    title: 'Predictive Modeling',
    desc: 'Get ahead of the risks — forecast enrollment, predict dropout, flag anomalies, and analyze real-world evidence, all from your own data.',
    tags: ['Enrollment forecasting', 'Trial risk', 'Dropout prediction', 'Anomaly detection', 'Real-world evidence'],
  },
  {
    Icon: Zap,
    title: 'Automation & Decision Support',
    desc: 'Cut the manual work — document processing, protocol support, reporting automation, and automated review that structures your data.',
    tags: ['Document processing', 'Reporting automation', 'Workflow optimization', 'Automated review'],
  },
];

const IMPROVEMENTS = [
  'Faster research decisions',
  'Better trial performance',
  'Improved enrollment visibility',
  'Stronger data quality',
  'Reduced reporting burden',
  'Better compliance readiness',
  'Improved operational efficiency',
  'Faster discovery cycles',
  'Better executive visibility',
  'Stronger research outcomes',
];

export default function BiomedicalResearchPage() {
  return (
    <div className="bg-white">

      {/* HERO — navy band */}
      <section className="bg-navy-deep">
        <div className="max-w-7xl mx-auto px-6 py-24 md:py-28">
          <div className="max-w-3xl mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-400 mb-5">Biomedical Research</p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-6">
              Faster discovery, stronger evidence
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed max-w-2xl">
              For research institutions, clinical trial teams, and biomedical organizations, we turn
              complex study data into faster insights, cleaner data, and outcomes you can defend — from
              early discovery through regulatory submission.
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
                Complex data, high stakes, no room for error
              </h2>
              <div className="space-y-5">
                <p className="text-base text-slate-700 leading-relaxed">
                  Research organizations manage huge amounts of complex data across trials, studies,
                  operations, and regulatory requirements.
                </p>
                <p className="text-base text-slate-700 leading-relaxed">
                  Good analytics and automation improve speed, accuracy, and visibility across the whole research
                  lifecycle — from early discovery through regulatory submission.
                </p>
                <p className="text-base text-slate-700 leading-relaxed">
                  That means stronger trial performance, cleaner data, faster insights, and more
                  defensible scientific outcomes.
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
              Three ways we help your research
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
            Better research starts with better systems
          </h2>
          <p className="text-lg text-slate-300 mb-12 leading-relaxed mx-auto max-w-xl">
            If your organization is ready to improve visibility, accelerate discovery, and strengthen
            research outcomes, let&apos;s talk.
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
