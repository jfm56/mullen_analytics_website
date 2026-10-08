import {
  FinalCta,
  ImprovementsSection,
  IndustryHero,
  ServicesSection,
  ValuePointList,
} from '@/components/industry/IndustrySections';
import {
  BarChart3, BrainCircuit, Zap, ShieldCheck, BadgeCheck, ClipboardCheck, Lock,
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

export const metadata = {
  title: 'Biomedical Research Analytics | Mullen Analytics',
  description:
    'Data pipelines, outcome modeling, and analytics built for scientific rigor and reproducibility in biomedical and clinical research.',
};

export default function BiomedicalResearchPage() {
  return (
    <div className="bg-white">

      <IndustryHero
        eyebrow="Biomedical Research"
        title="Faster discovery, stronger evidence"
        description="For research institutions, clinical trial teams, and biomedical organizations, we turn complex study data into faster insights, cleaner data, and outcomes you can defend — from early discovery through regulatory submission."
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
            <ValuePointList items={VALUE_POINTS} />
          </div>
        </div>
      </section>

      <ServicesSection heading="Three ways we help your research" services={SERVICES} />
      <ImprovementsSection items={IMPROVEMENTS} />
      <FinalCta
        title="Better research starts with better systems"
        description="If your organization is ready to improve visibility, accelerate discovery, and strengthen research outcomes, let's talk."
        calendarUrl={CALENDAR_URL}
      />

    </div>
  );
}
