import PrivateSecureAI from '@/components/PrivateSecureAI';
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
  title: 'Healthcare Data Analytics & Predictive Modeling | Mullen Analytics',
  description:
    'Healthcare analytics: forecast demand, improve staffing, analyze patient flow and length of stay, reduce readmissions, and automate reporting with clinical accountability.',
};

export default function HealthcarePage() {
  return (
    <div className="bg-white">

      <IndustryHero
        eyebrow="Healthcare"
        title="Better care, smarter operations"
        description="For hospitals, health systems, and clinical operations teams, we turn your data into better patient flow, smarter staffing, and decisions leadership can stand behind — without adding to the charting burden."
        trustPillars={TRUST_PILLARS}
        calendarUrl={CALENDAR_URL}
      />

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
            <ValuePointList items={VALUE_POINTS} />
          </div>
        </div>
      </section>

      <ServicesSection heading="Three ways we help your organization" services={SERVICES} />
      <ImprovementsSection items={IMPROVEMENTS} />

      <PrivateSecureAI domain="protected health information" />

      <FinalCta
        title="Better healthcare decisions start with better data"
        description="If your organization is ready to improve operations, cut waste, and strengthen patient outcomes, let's talk."
        calendarUrl={CALENDAR_URL}
      />

    </div>
  );
}
