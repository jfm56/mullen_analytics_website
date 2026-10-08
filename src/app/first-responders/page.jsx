import {
  FinalCta,
  ImprovementsSection,
  IndustryHero,
  ServicesSection,
  ValuePointList,
} from '@/components/industry/IndustrySections';
import {
  BarChart3, BrainCircuit, Zap, ShieldCheck, Siren, BadgeCheck, Lock,
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

      <IndustryHero
        eyebrow="EMS · Fire · Public Safety"
        title="EMS Analytics & Consulting Services"
        subheadline="Better decisions when seconds count."
        description="Analytics and consulting for EMS agencies looking to improve response times, staffing, deployment, QA/QI, reporting, and operational performance."
        trustPillars={TRUST_PILLARS}
        calendarUrl={CALENDAR_URL}
      />

      {/* WORKS WITH YOUR DATA — slim band */}
      <section className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8">
            <p className="text-sm font-bold text-slate-900 flex-shrink-0">Works with your existing EMS data</p>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
              {['emsCharts', 'ESO', 'ImageTrend', 'NEMSIS', 'CAD exports', 'CSV', 'Excel'].map((s) => (
                <span key={s} className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-full px-3 py-1.5">{s}</span>
              ))}
            </div>
            <p className="text-sm text-slate-500 lg:ml-auto flex-shrink-0">No system replacement required.</p>
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
            <ValuePointList items={VALUE_POINTS} />
          </div>
        </div>
      </section>

      <ServicesSection
        heading="Three ways we help your agency"
        services={SERVICES}
        descriptionClassName="text-slate-600"
      />
      <ImprovementsSection items={IMPROVEMENTS} />
      <FinalCta
        title="Better decisions start with better data"
        description="If your agency is ready to respond faster, staff smarter, and make decisions you can stand behind, let's talk."
        calendarUrl={CALENDAR_URL}
      />

    </div>
  );
}
