import { Check, ArrowRight, Activity, FileText, Clock, ShieldCheck, Ambulance } from 'lucide-react';
import AssessmentRequestForm from '@/components/AssessmentRequestForm';

export const metadata = {
  title: 'Free EMS Data & Performance Assessment | Mullen Analytics & Data Solutions',
  description:
    'A complimentary EMS Data & Performance Assessment: we review a de-identified sample of your CAD/ePCR/dispatch data and identify opportunities in demand, response times, utilization, staffing, QA/QI, and forecasting. Limited to 10 agencies.',
};

const EVALUATE = [
  'Call volume by hour, day, and location',
  'Response-time distributions and outliers',
  'Unit utilization',
  'Simultaneous-call demand',
  'Staffing versus workload',
  'Geographic demand patterns',
  'Mutual-aid activity',
  'Peak demand periods',
  'Data-quality issues',
  'QA/QI opportunities',
  'Recurring reporting automation',
  'Dashboard opportunities',
  'Demand and staffing forecasting',
];

const RECEIVE = [
  'Review of a de-identified operational data sample',
  'Initial EMS performance analysis',
  '30-minute findings review',
  'One-page EMS Analytics Opportunity Report',
  '3–5 opportunities identified for deeper analysis or automation',
];

export default function EmsAssessmentPage() {
  return (
    <div className="bg-white">
      {/* HERO */}
      <section className="bg-navy-deep">
        <div className="max-w-4xl mx-auto px-6 py-20 md:py-24">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-400 mb-4">Free · Limited to 10 agencies</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-[1.1] tracking-tight mb-4">
            Turn Your Existing EMS Data Into Operational Intelligence
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed mb-4">
            Your agency already collects enormous amounts of operational data through CAD, ePCR, scheduling, dispatch,
            and reporting systems. The question is: are you getting everything you can from it?
          </p>
          <p className="text-lg text-slate-300 leading-relaxed mb-8">
            Mullen Analytics &amp; Data Solutions is offering a <strong className="text-white">Free EMS Data &amp; Performance
            Assessment</strong> to a limited number of EMS and fire-based EMS agencies. We&rsquo;ll review a small,
            de-identified sample of your existing operational data and identify opportunities to improve reporting,
            understand demand, evaluate resource utilization, and support data-driven staffing and deployment decisions.
          </p>
          <a href="#request" className="inline-flex items-center gap-2 px-8 py-4 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base transition-colors">
            Claim my free EMS assessment <ArrowRight size={18} strokeWidth={2.5} />
          </a>
        </div>
      </section>

      {/* WHAT WE CAN EVALUATE */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">What We Can Evaluate</h2>
          <p className="text-base text-slate-600 mb-8">Depending on the available data:</p>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
            {EVALUATE.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <Check size={18} className="text-blue-600 mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                <span className="text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REAL EXPERIENCE */}
      <section className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-4">
            <Ambulance size={24} className="text-blue-600" />
            <h2 className="text-3xl font-bold text-slate-900">Real EMS Analytics Experience</h2>
          </div>
          <p className="text-base text-slate-700 leading-relaxed mb-4">
            Mullen Analytics is currently implementing an EMS analytics and automated data workflow with
            <strong> South Branch Emergency Services</strong>. The project transforms recurring EMS operational reports
            into validated, structured data that can support incident and unit-response analysis, response-time metrics,
            quality checks, reporting, staffing and demand analysis, geographic trends, unit utilization, QA/QI, and
            forecasting.
          </p>
          <p className="text-base text-slate-700 leading-relaxed">
            The goal is simple: turn data EMS agencies already collect into repeatable information leadership can
            actually use.
          </p>
        </div>
      </section>

      {/* WHAT YOU RECEIVE + BUILT BY */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-2 gap-10">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold">100% Free</span>
              <h2 className="text-2xl font-bold text-slate-900">What Your Agency Receives</h2>
            </div>
            <div className="space-y-3">
              {RECEIVE.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <Check size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                  <span className="text-slate-700">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-500 mt-6">
              There is no obligation and no requirement to replace your existing CAD, ePCR, or reporting systems.
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-7">
            <h3 className="text-xl font-bold text-slate-900 mb-3">Built by Someone Who Understands EMS</h3>
            <p className="text-base text-slate-700 leading-relaxed mb-4">
              Mullen Analytics combines real-world firefighter/paramedic experience with modern data science, machine
              learning, data engineering, and analytics.
            </p>
            <p className="text-base text-slate-700 leading-relaxed">
              That means we&rsquo;re approaching the data from both sides: what the numbers say and what actually matters
              operationally.
            </p>
          </div>
        </div>
      </section>

      {/* REQUEST */}
      <section id="request" className="py-20 bg-navy-deep scroll-mt-20">
        <div className="max-w-2xl mx-auto px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-400 mb-3">Limited to 10 agencies</p>
          <h2 className="text-3xl font-bold text-white mb-3">Claim Your Free EMS Assessment</h2>
          <p className="text-base text-slate-300 mb-8">Tell us how to reach you and we&rsquo;ll set up your assessment.</p>
          <AssessmentRequestForm
            tool="assessment_ems"
            cta="Claim my free EMS assessment"
            orgLabel="Agency"
            orgPlaceholder="Your EMS / fire agency"
            doneNote="Jim will follow up to schedule your findings review and establish a secure process for any de-identified data."
            privacyNote="Do not upload PHI or patient-identifiable information through this form. Initial assessments use de-identified / non-PHI data; if sensitive information is required for future work, an appropriate secure process will be established."
          />
        </div>
      </section>
    </div>
  );
}
