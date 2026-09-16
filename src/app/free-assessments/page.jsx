import Link from 'next/link';
import { ArrowRight, Building2, Ambulance, Check } from 'lucide-react';

export const metadata = {
  title: 'Free Assessments | Mullen Analytics & Data Solutions',
  description:
    'Two complimentary, no-obligation assessments: a Business Profit & Data Checkup and an EMS Data & Performance Assessment. We review data you already collect and identify 3–5 concrete opportunities.',
};

const CARDS = [
  {
    href: '/free-assessments/business',
    Icon: Building2,
    eyebrow: 'For Businesses',
    title: 'Free Profit & Data Checkup',
    desc: 'We review a sample of the data your business already collects — accounting, scheduling, CRM, POS, spreadsheets, marketing — and find opportunities to increase profit, cut costs, and improve operations.',
    bullets: ['20–30 min consultation', 'One-page Opportunity Report', '3–5 opportunities to investigate'],
    limit: 'Limited to 20 businesses',
    cta: 'Explore the Business Checkup',
  },
  {
    href: '/free-assessments/ems',
    Icon: Ambulance,
    eyebrow: 'For EMS & Fire Agencies',
    title: 'Free EMS Data & Performance Assessment',
    desc: 'We review a de-identified sample of your CAD/ePCR/dispatch data and identify opportunities across demand, response times, utilization, staffing, QA/QI, geographic trends, and forecasting.',
    bullets: ['30-min findings review', 'One-page EMS Opportunity Report', '3–5 opportunities identified'],
    limit: 'Limited to 10 agencies',
    cta: 'Explore the EMS Assessment',
  },
];

export default function FreeAssessmentsPage() {
  return (
    <div className="bg-white">
      {/* HERO */}
      <section className="bg-navy-deep">
        <div className="max-w-5xl mx-auto px-6 py-20 md:py-24 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-400 mb-4">Free · No obligation</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-[1.1] tracking-tight mb-5">Free Assessments</h1>
          <p className="text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
            You&rsquo;re already collecting the data. We&rsquo;ll review a sample of what you have and hand you a short,
            specific list of opportunities — no new software, no obligation. Pick the assessment that fits.
          </p>
        </div>
      </section>

      {/* CARDS */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-2 gap-8">
          {CARDS.map((c) => (
            <Link key={c.href} href={c.href}
              className="group flex flex-col bg-white border border-slate-200 rounded-2xl p-8 shadow-sm hover:shadow-lg hover:border-blue-500 hover:-translate-y-1 transition-all duration-200">
              <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-700 flex items-center justify-center mb-5">
                <c.Icon size={24} strokeWidth={2} />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-2">{c.eyebrow}</p>
              <h2 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-blue-700 transition-colors">{c.title}</h2>
              <p className="text-base text-slate-600 leading-relaxed mb-5">{c.desc}</p>
              <div className="space-y-2 mb-6">
                {c.bullets.map((b) => (
                  <div key={b} className="flex items-center gap-2 text-sm text-slate-700">
                    <Check size={16} className="text-blue-600 flex-shrink-0" strokeWidth={2.5} /> {b}
                  </div>
                ))}
              </div>
              <div className="mt-auto flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">{c.limit}</span>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700">
                  {c.cta}
                  <ArrowRight size={15} strokeWidth={2.5} className="transition-transform duration-200 group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
