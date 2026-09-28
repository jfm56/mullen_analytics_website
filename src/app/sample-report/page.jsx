import Link from 'next/link';
import {
  TrendingDown, Clock, Users, LineChart, ArrowRight, CheckCircle2, FileText, ShieldCheck,
} from 'lucide-react';

export const metadata = {
  title: 'Sample Opportunity Report | Mullen Analytics',
  description:
    'See the kind of report you receive from a free Mullen Analytics assessment — 3–5 specific, prioritized opportunities found in the data you already have. Figures shown are illustrative.',
};

const FINDINGS = [
  {
    Icon: TrendingDown, tint: 'text-rose-600 bg-rose-50 border-rose-100', tag: 'Revenue',
    finding: 'Revenue declined 8.3% during historically high-volume periods.',
    detail: 'Your two strongest weeks last year underperformed the prior year — a demand-capture gap, not a market decline.',
  },
  {
    Icon: Clock, tint: 'text-amber-600 bg-amber-50 border-amber-100', tag: 'Labor',
    finding: 'Scheduling indicates ~11% excess labor during lower-demand windows.',
    detail: 'Staffing is roughly flat across the week while demand is not — hours are concentrated where they return the least.',
  },
  {
    Icon: Users, tint: 'text-blue-600 bg-blue-50 border-blue-100', tag: 'Customers',
    finding: 'Repeat customers generate 2.4× the revenue of first-time customers.',
    detail: 'The top ~20% of customers already drive most revenue, but there is no repeat-purchase mechanism in place.',
  },
  {
    Icon: LineChart, tint: 'text-emerald-600 bg-emerald-50 border-emerald-100', tag: 'Forecast',
    finding: 'Next-quarter demand is projected to rise ~6–9%.',
    detail: 'Based on the last 18 months of trend and seasonality — enough lead time to staff and stock ahead of it.',
  },
];

const ACTIONS = [
  {
    title: 'Re-weight staffing to the demand curve',
    body: 'Shift roughly 11% of labor hours out of the two lowest-demand windows into your peak days. Same headcount, better coverage where it pays.',
  },
  {
    title: 'Launch a light repeat-customer program',
    body: 'A simple retention touch aimed at the top 20% of customers compounds — they already convert at 2.4× first-timers.',
  },
  {
    title: 'Automate a weekly revenue + demand dashboard',
    body: 'Replace the manual month-end report with an automated weekly view, so a decline like the 8.3% dip is caught in-week, not a month later.',
  },
];

export default function SampleReport() {
  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Intro band */}
      <section className="bg-navy-deep">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-sky-400 mb-3">Sample deliverable</p>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Your Free Opportunity Report</h1>
          <p className="text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
            This is the kind of report you receive after a free assessment — <strong className="text-white">3–5 specific,
            prioritized opportunities</strong> found in the data you already have, with practical next steps. The
            figures below are illustrative, not from a real client.
          </p>
        </div>
      </section>

      {/* The "report" itself */}
      <section className="max-w-4xl mx-auto px-6 -mt-10 pb-20">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Report header */}
          <div className="border-b border-slate-200 px-7 py-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600/10 text-blue-700 flex items-center justify-center">
                <FileText size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Opportunity Report</p>
                <p className="text-xs text-slate-500">Prepared for: Sample Business Co. · Illustrative</p>
              </div>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
              Sample — figures illustrative
            </span>
          </div>

          {/* Findings */}
          <div className="px-7 py-6">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">What we found</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {FINDINGS.map(({ Icon, tint, tag, finding, detail }) => (
                <div key={tag} className="border border-slate-200 rounded-xl p-5">
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <span className={`w-9 h-9 rounded-lg border flex items-center justify-center ${tint}`}>
                      <Icon size={18} />
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{tag}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 leading-snug mb-1.5">{finding}</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended actions */}
          <div className="px-7 py-6 bg-slate-50 border-t border-slate-200">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">3 recommended actions</p>
            <ol className="space-y-3">
              {ACTIONS.map(({ title, body }, i) => (
                <li key={title} className="flex items-start gap-3.5">
                  <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{title}</p>
                    <p className="text-sm text-slate-600 leading-relaxed mt-0.5">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Report footer */}
          <div className="px-7 py-4 border-t border-slate-200 flex items-start gap-2 text-xs text-slate-500">
            <ShieldCheck size={14} className="mt-0.5 flex-shrink-0 text-slate-400" />
            <span>
              Illustrative sample — figures are not from a real client. Your report is built from your own data and
              handled confidentially. Nothing is published or shared.
            </span>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 bg-blue-600 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Get a report like this — on your data</h2>
          <p className="text-blue-100 mb-6 max-w-xl mx-auto">
            Send a sample of the data you already collect and I&apos;ll hand you your own 3–5 opportunities. No new
            software. No obligation.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/free-assessments"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-white text-blue-700 font-semibold hover:bg-blue-50 transition-colors">
              Get My Free Assessment <ArrowRight size={17} strokeWidth={2.5} />
            </Link>
            <Link href="/revenue-checker"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg border border-white/40 text-white font-semibold hover:bg-white/10 transition-colors">
              Try the free Revenue Checker
            </Link>
          </div>
          <p className="text-xs text-blue-200 mt-5 inline-flex items-center gap-1.5">
            <CheckCircle2 size={13} /> Veteran-owned · Secure &amp; confidential · Built by an operator
          </p>
        </div>
      </section>
    </div>
  );
}
