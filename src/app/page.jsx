import Link from 'next/link';
import { BarChart3, BrainCircuit, FlaskConical, Database, ArrowRight, LineChart, Calculator, Building2, Ambulance } from 'lucide-react';
import ScheduleCTA from '@/components/ScheduleCTA';

// NOTE: The marketing home uses a FIXED palette (always light, with navy bands),
// not the theme-aware tokens. A landing page has one intentional design; letting
// it flip to dark on a visitor's system preference collapses the section rhythm
// (bg-background and the navy bands become the same color). Navy bands use the
// fixed --navy-* tokens; everything else uses fixed Tailwind grays.

const DISCIPLINES = [
  { Icon: BarChart3,   title: 'Data Analytics',        desc: 'Clear, at-a-glance views of how your organization is doing — so the numbers that matter are easy to see and act on, instead of buried in spreadsheets.' },
  { Icon: BrainCircuit, title: 'Machine Learning & Automation', desc: 'Software that learns from your past to predict what is coming and handle repetitive work automatically — built so you can see how it reached its answer.' },
  { Icon: FlaskConical, title: 'Data Science',          desc: 'Digging into your data to find the real answers: why something is happening, what is likely next, and what to do about it.' },
  { Icon: Database,     title: 'Data Engineering',      desc: 'Gathering your data from all the places it lives, cleaning it up, and keeping it in one reliable, up-to-date place you can actually use.' },
];

const SECTORS = [
  { label: 'Business',          title: 'Business & Commercial',      desc: 'Forecasting, KPI dashboards, customer and operations analytics, and the data infrastructure underneath them.', href: '/industries' },
  { label: 'Public Safety',     title: 'First Responders',           desc: 'Demand forecasting, staffing and deployment models, response-time analysis, and unit utilization for EMS, fire, and public safety.', href: '/first-responders' },
  { label: 'Healthcare',        title: 'Healthcare Analytics',        desc: 'Clinical operations, quality improvement, patient flow, and documentation automation with clinical accountability built in.', href: '/healthcare' },
  { label: 'Research',          title: 'Biomedical Research',         desc: 'Data pipelines, outcome modeling, and analytics built for scientific rigor and reproducibility.', href: '/biomedical-research' },
];

const PILLARS = [
  { title: 'Explainable', desc: 'Every model and insight is designed to be understood — not just trusted on faith.' },
  { title: 'Defensible', desc: 'Built for accountability in regulated, auditable, and high-consequence environments.' },
  { title: 'Secure', desc: 'Systems architected for sensitive operational, clinical, and government data.' },
  { title: 'Operationally Useful', desc: 'Tools built around how your teams actually work — not how consultants imagine they do.' },
  { title: 'Leadership-Ready', desc: 'Outputs your leadership can act on, stand behind, and use in procurement reviews.' },
  { title: 'Real-World Experience', desc: 'Built on emergency services and healthcare operations — not theoretical frameworks.' },
];

const FOCUS_AREAS = [
  'Demand forecasting', 'Staffing and deployment models', 'Response time analysis',
  'Disaster response & damage assessment',
  'Executive KPI dashboards', 'Predictive modeling for planning', 'Data pipelines & warehousing',
  'Data quality and validation', 'Automated reporting', 'Document processing & automation',
  'Quality improvement analytics', 'Patient flow and clinical operations', 'Research outcome modeling',
];

const SELECTED_WORK = [
  { sector: 'EMS Operations',      title: 'Demand Forecasting & Staffing Optimization', desc: 'Predictive models and operational dashboards supporting resource allocation decisions for high-volume emergency services.' },
  { sector: 'Healthcare Analytics', title: 'Explainable ML for Medical Classification',   desc: 'Interpretable machine learning models built for transparency, clinical accountability, and executive-level defensibility.' },
  { sector: 'Automation',          title: 'Automated Reporting & Document Processing',    desc: 'Practical automation tools reducing manual workload and improving consistency across high-volume operational workflows.' },
];

const TRUST_BADGES = ['Veteran-Owned', 'Former First Responders', 'Explainable Results', 'Procurement-Ready'];

const CALENDAR_URL = 'https://calendar.app.google/1BFgdi2pgjF9vwAB8';

// Reusable section eyebrow
function Eyebrow({ children }) {
  return <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-3">{children}</p>;
}

export const metadata = {
  title: 'Data Analytics & Automation Consulting | Mullen Analytics & Data Solutions',
  description:
    'Practical data, analytics, and automation systems — forecasting, dashboards, and decision support for business, EMS & public safety, and healthcare.',
};

export default function Home() {
  return (
    <div className="bg-white">

      {/* HERO — navy band, balanced two-column */}
      <section className="bg-navy-deep">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28">
          <div className="grid lg:grid-cols-2 gap-12 xl:gap-16 items-center">
            {/* Message */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-sky-400 mb-5">
                Veteran-Owned · Data Science · Real Operational Experience
              </p>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight mb-6">
                Find the Problems Costing You Money
              </h1>
              <p className="text-lg text-slate-300 leading-relaxed mb-8">
                Use the data you already have to uncover wasted cost, forecast revenue and demand, automate
                reporting, and make sharper operational decisions — for business, EMS &amp; public safety,
                and healthcare.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/free-assessments"
                  className="px-8 py-4 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base text-center transition-colors">
                  Get a Free Data &amp; Profit Assessment
                </Link>
                <ScheduleCTA href={CALENDAR_URL}
                  className="px-8 py-4 rounded border border-navy-border hover:border-slate-500 text-slate-200 hover:text-white font-semibold text-base text-center transition-colors">
                  Schedule a Strategy Call
                </ScheduleCTA>
              </div>
              <p className="text-sm text-slate-400 mt-4 max-w-xl">
                We review a sample of the data you already collect and hand you{' '}
                <strong className="text-slate-200">3–5 specific opportunities</strong> to improve revenue,
                cost, or efficiency. No new software. No obligation.
              </p>
            </div>

            {/* Dashboard preview — balances the hero + shows the product */}
            <div className="hidden lg:block">
              <div className="bg-navy-surface border border-navy-border rounded-2xl p-6 shadow-2xl ring-1 ring-white/5">
                <div className="flex items-center justify-between mb-5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Operations Overview</span>
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Live
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[['Revenue', '$4.8M'], ['YoY', '+12.4%'], ['Forecast', '94%']].map(([l, v]) => (
                    <div key={l} className="bg-navy-deep border border-navy-border rounded-lg px-3 py-3">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">{l}</p>
                      <p className="text-lg font-bold text-white tabular-nums">{v}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-baseline justify-between mb-3">
                  <span className="text-[11px] font-semibold text-slate-300">Monthly trend</span>
                  <span className="text-[10px] text-slate-500">12 mo</span>
                </div>
                <div className="flex items-end gap-1.5 h-28">
                  {[52, 58, 55, 64, 68, 66, 74, 80, 78, 86, 90, 96].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-blue-600 to-sky-400" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP — darker navy */}
      <div className="bg-navy-surface border-y border-navy-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
            {['Veteran-Owned', 'Former First Responders', 'Explainable Results', 'Secure & Compliant', 'Procurement-Ready'].map((m) => (
              <div key={m} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 flex-shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{m}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PROOF BAND — sectors + capabilities, tangible credibility high up */}
      <div className="bg-navy-deep border-b border-navy-border">
        <div className="max-w-7xl mx-auto px-6 py-6 text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-sky-400 mb-3">Built for operational data</p>
          <p className="text-sm font-semibold text-slate-200 mb-2">
            EMS &amp; Public Safety · Healthcare · Government · Business · Research
          </p>
          <p className="text-xs text-slate-400 tracking-wide">
            Forecasting · Machine Learning · AWS Data Engineering · Automation
          </p>
        </div>
      </div>

      {/* FREE ASSESSMENTS — priority lead-gen offer, high on the page */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-200 mb-2">Free · No obligation</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Free Assessments</h2>
            <p className="text-base text-blue-100 max-w-2xl mx-auto leading-relaxed">
              We review a sample of the data you already collect and hand you 3–5 specific opportunities — no new
              software, no obligation.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Link href="/free-assessments/business"
              className="group bg-white rounded-2xl p-7 shadow-lg hover:-translate-y-1 transition-all duration-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-blue-600/10 text-blue-700 flex items-center justify-center"><Building2 size={22} /></div>
                <p className="text-xs font-bold uppercase tracking-widest text-sky-600">For Businesses</p>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-700 transition-colors">Profit &amp; Data Checkup</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">Find where your business could be losing money — a 20–30 min consult plus a one-page Opportunity Report.</p>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700">Claim yours <ArrowRight size={15} strokeWidth={2.5} className="transition-transform group-hover:translate-x-1" /></span>
            </Link>
            <Link href="/free-assessments/ems"
              className="group bg-white rounded-2xl p-7 shadow-lg hover:-translate-y-1 transition-all duration-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-blue-600/10 text-blue-700 flex items-center justify-center"><Ambulance size={22} /></div>
                <p className="text-xs font-bold uppercase tracking-widest text-sky-600">For EMS &amp; Fire Agencies</p>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-700 transition-colors">EMS Data &amp; Performance Assessment</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">Turn your CAD/ePCR data into operational intelligence — a de-identified sample plus a 30-min findings review.</p>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700">Claim yours <ArrowRight size={15} strokeWidth={2.5} className="transition-transform group-hover:translate-x-1" /></span>
            </Link>
          </div>
        </div>
      </section>

      {/* FOUNDER — surface Jim early; for a small firm, people hire the person */}
      <section className="py-16 bg-navy-deep border-b border-navy-border">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-xs font-bold uppercase tracking-widest text-sky-400 mb-3 text-center">Why Mullen Analytics</p>
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">Built by an operator, not just a consultant.</h2>
          <p className="text-base text-slate-300 leading-relaxed text-center max-w-2xl mx-auto mb-7">
            You&rsquo;re not hiring an anonymous firm — you work directly with the person who does the analysis
            and builds the system. I spent years in emergency services before earning my M.S. in Data Science,
            so I read your operation the way an operator does, then back it with real data science and engineering.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-x-6 gap-y-3 text-center sm:text-left">
            <div>
              <p className="text-lg font-bold text-white">Jim Mullen, MSDS</p>
              <p className="text-sm text-slate-400">Founder &amp; Data Scientist</p>
            </div>
            <div className="hidden sm:block w-px h-10 bg-navy-border" />
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              {['Former First Responder', 'Veteran', 'M.S. Data Science'].map((m) => (
                <span key={m} className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500" /> {m}
                </span>
              ))}
            </div>
          </div>
          <div className="text-center mt-7">
            <Link href="/about" className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-400 hover:text-sky-300">
              More about Jim &amp; the approach <ArrowRight size={15} strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </section>

      {/* WHAT WE DO — white section, tinted cards */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">What We Do</h2>
            <p className="text-base text-slate-600 leading-relaxed">
              The four things we do — from getting your data organized and trustworthy, to turning it
              into clear answers your team can act on.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {DISCIPLINES.map(({ Icon, title, desc }) => (
              <div key={title} className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <div className="w-11 h-11 rounded-lg bg-blue-600/10 flex items-center justify-center mb-4">
                  <Icon size={20} strokeWidth={1.75} className="text-blue-700" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHO WE SERVE — light-gray section, white cards that lift */}
      <section className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Who We Serve</h2>
            <p className="text-base text-slate-600 leading-relaxed">
              The same rigor, applied to the environments where being wrong is expensive.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SECTORS.map((s) => (
              <Link key={s.title} href={s.href}
                className="group flex flex-col bg-white border border-slate-200 rounded-xl p-7 shadow-sm hover:shadow-md hover:border-blue-500 hover:-translate-y-0.5 transition-all duration-200">
                <Eyebrow>{s.label}</Eyebrow>
                <h3 className="text-lg font-bold text-slate-900 mb-3 group-hover:text-blue-700 transition-colors">{s.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-6 flex-1">{s.desc}</p>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700">
                  Learn more
                  <ArrowRight size={15} strokeWidth={2.5} className="transition-transform duration-200 group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FREE TOOLS — self-serve lead magnets, no signup */}
      <section className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-2">Free &middot; No signup</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">Try a free tool</h2>
            <p className="text-base text-slate-600 leading-relaxed">
              Get a read on your numbers in a couple of minutes. Everything runs in your browser — nothing is
              stored or sent unless you ask us to take a look.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            <Link href="/revenue-checker"
              className="group flex flex-col bg-slate-50 border border-slate-200 rounded-xl p-7 hover:shadow-md hover:border-blue-500 hover:-translate-y-0.5 transition-all duration-200">
              <div className="w-11 h-11 rounded-lg bg-blue-600/10 text-blue-700 flex items-center justify-center mb-4">
                <LineChart size={22} strokeWidth={2} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-700 transition-colors">Business Revenue Checker</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-6 flex-1">
                Enter 12 months of revenue and see your trend, momentum, year-over-year change, and a simple
                forecast — plus a quick health read.
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700">
                Check your revenue
                <ArrowRight size={15} strokeWidth={2.5} className="transition-transform duration-200 group-hover:translate-x-1" />
              </span>
            </Link>
            <Link href="/profit-calculator"
              className="group flex flex-col bg-slate-50 border border-slate-200 rounded-xl p-7 hover:shadow-md hover:border-blue-500 hover:-translate-y-0.5 transition-all duration-200">
              <div className="w-11 h-11 rounded-lg bg-blue-600/10 text-blue-700 flex items-center justify-center mb-4">
                <Calculator size={22} strokeWidth={2} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-700 transition-colors">Profit Calculator</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-6 flex-1">
                Plug in your pricing, costs, and volume to see margins, contribution per unit, break-even, and how
                long it takes to earn back your startup costs.
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700">
                Calculate your profit
                <ArrowRight size={15} strokeWidth={2.5} className="transition-transform duration-200 group-hover:translate-x-1" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* PLAIN-ENGLISH GUIDE — teaser linking to the full article */}
      <section className="py-16 bg-white border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-6">
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-8 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-2">New to this?</p>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                Data Science vs. Data Engineering — in plain English
              </h2>
              <p className="text-base text-slate-600 leading-relaxed">
                They get mixed up all the time, but they&apos;re two different jobs. A quick, no-jargon guide to
                what each one does and how they work together.
              </p>
            </div>
            <Link href="/guides/data-science-vs-data-engineering"
              className="inline-flex items-center gap-1.5 flex-shrink-0 px-6 py-3.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors">
              Read the guide
              <ArrowRight size={16} strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </section>

      {/* BUILT FOR HIGH-STAKES — navy band (strong anchor) */}
      <section className="py-24 bg-navy-deep">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Built for High-Stakes Operations</h2>
            <p className="text-base text-slate-300 leading-relaxed">
              Your data represents customers, crews, response times, staffing decisions, budgets, and
              public trust. Every system we build reflects that weight.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PILLARS.map((item) => (
              <div key={item.title} className="p-6 rounded-xl bg-navy-surface border border-navy-border">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" />
                  <h3 className="font-bold text-sm text-white">{item.title}</h3>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOCUS AREAS — white section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-14">Focus Areas</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-5xl">
            {FOCUS_AREAS.map((area) => (
              <div key={area} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-bold text-blue-700 flex-shrink-0">→</span>
                <span className="text-sm font-medium text-slate-700">{area}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SELECTED WORK — light-gray section, white cards */}
      <section className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Selected Work</h2>
            <Link href="/portfolio" className="hidden md:block text-sm font-semibold text-blue-700">View all →</Link>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {SELECTED_WORK.map((work) => (
              <Link key={work.title} href="/portfolio"
                className="block bg-white border border-slate-200 border-t-[3px] border-t-blue-600 rounded-xl p-7 shadow-sm hover:shadow-md transition-all">
                <Eyebrow>{work.sector}</Eyebrow>
                <h3 className="text-base font-bold text-slate-900 mb-3 leading-snug">{work.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-5">{work.desc}</p>
                <span className="text-xs font-semibold text-blue-700">View case study →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* WHY MULLEN ANALYTICS — white section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-8 border-l-[3px] border-sky-500 pl-5">
                Why Mullen Analytics
              </h2>
              <div className="space-y-5">
                <p className="text-base text-slate-700 leading-relaxed">
                  Mullen Analytics pairs real, hands-on operational experience with genuine data science,
                  forecasting, and automation — and puts it to work anywhere decisions depend on getting the data right.
                </p>
                <p className="text-base text-slate-700 leading-relaxed">
                  Our roots are in emergency services and healthcare — about as high-pressure as it gets,
                  where staffing, response times, and outcomes are on the line. That is where we learned
                  data has to be accurate, clear, and something you can stand behind.
                </p>
                <p className="text-base text-slate-700 leading-relaxed">
                  We bring that same standard to businesses, research teams, and any organization
                  that needs to turn messy, scattered data into decisions it can trust.
                </p>
                <p className="text-base text-slate-900 font-semibold leading-relaxed">
                  We do not build science experiments or one-size-fits-all tools. We build practical
                  systems your team will actually use, your leadership can trust, and your organization can grow with.
                </p>
              </div>
              <div className="mt-10 flex flex-wrap gap-3">
                {TRUST_BADGES.map((badge) => (
                  <span key={badge} className="px-4 py-2 rounded text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                    {badge}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Approach', value: 'Explainable', sub: 'Models You Can Defend' },
                { label: 'Commitment', value: 'Operator-Level', sub: 'Domain Expertise' },
                { label: 'Output', value: 'Defensible', sub: 'Systems Leadership Can Trust' },
                { label: 'Delivery', value: 'Procurement', sub: 'Ready & Compliant' },
              ].map((stat) => (
                <div key={stat.label} className="p-6 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">{stat.label}</p>
                  <p className="text-xl font-bold text-slate-900 mb-1">{stat.value}</p>
                  <p className="text-xs text-slate-600 leading-snug">{stat.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA — navy band */}
      <section className="py-28 bg-navy-deep">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight mb-6 mx-auto max-w-3xl">
            Let&apos;s Build Systems Your Team Can Actually Use
          </h2>
          <p className="text-lg text-slate-300 mb-12 mx-auto leading-relaxed max-w-xl">
            If your organization is ready to improve operations, reduce manual work, and make stronger
            leadership decisions, we should talk.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact"
              className="px-10 py-5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base text-center transition-colors">
              Start a Conversation
            </Link>
            <ScheduleCTA href={CALENDAR_URL}
              className="px-10 py-5 rounded border border-navy-border hover:border-slate-500 text-slate-200 hover:text-white font-semibold text-base text-center transition-colors">
              Schedule a Strategy Call
            </ScheduleCTA>
          </div>
        </div>
      </section>

    </div>
  );
}
