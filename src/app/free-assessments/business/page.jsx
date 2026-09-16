import Link from 'next/link';
import { Check, ArrowRight, Gift, FileText, Clock, ShieldCheck } from 'lucide-react';
import AssessmentRequestForm from '@/components/AssessmentRequestForm';

export const metadata = {
  title: 'Free Business Profit & Data Checkup | Mullen Analytics & Data Solutions',
  description:
    'A complimentary Profit & Data Checkup: we review a sample of the data your business already collects and identify 3–5 opportunities to increase profit, cut costs, and improve operations. Limited to 20 businesses.',
};

const LOOK_FOR = [
  'Revenue and profitability trends',
  'Revenue leakage and unnecessary expenses',
  'Labor and employee utilization',
  'Scheduling gaps and unused capacity',
  'Most and least profitable services',
  'Customer acquisition and marketing ROI',
  'Lead and sales conversion',
  'Customer retention and repeat business',
  'Seasonal demand patterns',
  'Reporting that could be automated',
  'Opportunities for dashboards, analytics, or AI automation',
];

export default function BusinessAssessmentPage() {
  return (
    <div className="bg-white">
      {/* HERO */}
      <section className="bg-navy-deep">
        <div className="max-w-4xl mx-auto px-6 py-20 md:py-24">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-400 mb-4">Free · Limited to 20 businesses</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-[1.1] tracking-tight mb-4">
            Find Out Where Your Business Could Be Losing Money
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed mb-4">
            Your business already generates valuable data through accounting software, scheduling systems, CRM
            platforms, POS systems, spreadsheets, and marketing tools. The problem is that most businesses aren&rsquo;t
            using that information to its full potential.
          </p>
          <p className="text-lg text-slate-300 leading-relaxed mb-8">
            Mullen Analytics &amp; Data Solutions is offering a complimentary <strong className="text-white">Profit &amp; Data
            Checkup</strong> to a limited number of businesses. We&rsquo;ll review a sample of the data you already
            collect and look for opportunities to increase profitability, reduce unnecessary costs, and improve operations.
          </p>
          <a href="#request" className="inline-flex items-center gap-2 px-8 py-4 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base transition-colors">
            Claim my free Profit &amp; Data Checkup <ArrowRight size={18} strokeWidth={2.5} />
          </a>
        </div>
      </section>

      {/* WHAT WE'LL LOOK FOR */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">What We&rsquo;ll Look For</h2>
          <p className="text-base text-slate-600 mb-8">Depending on your business, we may analyze:</p>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
            {LOOK_FOR.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <Check size={18} className="text-blue-600 mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                <span className="text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT YOU RECEIVE */}
      <section className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-8">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold"><Gift size={15} /> 100% Free</span>
            <h2 className="text-3xl font-bold text-slate-900">What You Receive</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <Clock size={22} className="text-blue-600 mb-3" />
              <h3 className="font-bold text-slate-900 mb-1">20–30 minute consultation</h3>
              <p className="text-sm text-slate-600">A focused conversation about your business and the data you already have.</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <FileText size={22} className="text-blue-600 mb-3" />
              <h3 className="font-bold text-slate-900 mb-1">One-page Opportunity Report</h3>
              <p className="text-sm text-slate-600">Roughly 3–5 concrete opportunities worth investigating.</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <ShieldCheck size={22} className="text-blue-600 mb-3" />
              <h3 className="font-bold text-slate-900 mb-1">No obligation</h3>
              <p className="text-sm text-slate-600">No new software required. We work with the systems and data your business already has.</p>
            </div>
          </div>
        </div>
      </section>

      {/* REQUEST */}
      <section id="request" className="py-20 bg-navy-deep scroll-mt-20">
        <div className="max-w-2xl mx-auto px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-400 mb-3">Limited Availability · 20 businesses</p>
          <h2 className="text-3xl font-bold text-white mb-3">Claim Your Free Profit &amp; Data Checkup</h2>
          <p className="text-base text-slate-300 mb-8">Tell us how to reach you and we&rsquo;ll set up your assessment.</p>
          <AssessmentRequestForm
            tool="assessment_business"
            cta="Claim my free checkup"
            orgLabel="Business / Company"
            orgPlaceholder="Your business"
            doneNote="Jim will follow up to schedule your 20–30 minute consultation and the appropriate, secure way to share any data."
            privacyNote="Please don't submit sensitive personal, financial-account, patient, or other regulated information through this form. We'll discuss the appropriate way to provide any data needed for the assessment."
          />
        </div>
      </section>
    </div>
  );
}
