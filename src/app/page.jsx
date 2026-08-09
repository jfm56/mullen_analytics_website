import Link from 'next/link';
import { BarChart3, BrainCircuit, FlaskConical, Database, ArrowRight } from 'lucide-react';

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
  { label: 'Drone & Geospatial', title: 'Drone Analytics & Surveying', desc: 'Survey processing, mapping, geospatial analytics, and disaster-response imagery turned into measurable, reportable insight.', href: '/drone-intelligence' },
  { label: 'Environmental',     title: 'Environmental & Wildfire',    desc: 'Wildfire risk prediction, remote sensing, environmental monitoring, and disaster-response analytics for agencies protecting land and communities.', href: '/environmental' },
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
  'Drone survey processing & mapping', 'Geospatial and spatial analytics', 'Disaster response & damage assessment',
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

export default function Home() {
  return (
    <div className="bg-white">

      {/* HERO — navy band */}
      <section className="bg-navy-deep">
        <div className="max-w-7xl mx-auto px-6 py-24 md:py-32">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-400 mb-5">
              Analytics · Machine Learning · Data Engineering
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight mb-6">
              Analytics &amp; Automation for Business, Public Safety, and Drone Operations
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed max-w-2xl mb-10">
              Data science, machine learning, and data engineering — from demand forecasting and
              geospatial survey analysis to disaster response and executive dashboards. Built to be
              explainable, defensible, and actually used.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer"
                className="px-8 py-4 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base text-center transition-colors">
                Schedule a Strategy Call
              </a>
              <Link href="/capabilities"
                className="px-8 py-4 rounded border border-navy-border hover:border-slate-500 text-slate-200 hover:text-white font-semibold text-base text-center transition-colors">
                Explore Capabilities
              </Link>
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

      {/* WHAT THEY ARE — plain-language definitions (white) */}
      <section className="py-24 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Data Science &amp; Data Engineering — In Plain English
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              People mix these two up all the time. They&apos;re actually two different jobs. Here&apos;s what
              each one really means — no jargon.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Data Engineering */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-lg bg-blue-600/10 flex items-center justify-center flex-shrink-0">
                  <Database size={20} strokeWidth={1.75} className="text-blue-700" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-sky-600">Getting your data ready</p>
                  <h3 className="text-lg font-bold text-slate-900">Data Engineering</h3>
                </div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Your information lives all over the place — spreadsheets, software, paper records — and
                it&apos;s usually messy, out of date, or hard to pull together. Data engineering is the work of
                gathering it all, cleaning it up, and putting it in one place you can actually use. Think of
                it like the plumbing in a building: you never see it, but nothing works without it.
              </p>
              <p className="text-sm font-semibold text-slate-900 mb-5">
                The question it answers: <span className="font-normal text-slate-600">Can we trust this data — and is it all in one place?</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {['Gathering it all', 'Cleaning it up', 'Keeping it current', 'One place to look'].map((t) => (
                  <span key={t} className="text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-full px-2.5 py-1">{t}</span>
                ))}
              </div>
            </div>

            {/* Data Science */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-lg bg-blue-600/10 flex items-center justify-center flex-shrink-0">
                  <FlaskConical size={20} strokeWidth={1.75} className="text-blue-700" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-sky-600">Making sense of it</p>
                  <h3 className="text-lg font-bold text-slate-900">Data Science</h3>
                </div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Once your data is clean and ready, data science digs in to find answers you can use. It
                spots patterns, works out what&apos;s likely to happen next, and explains why. In short, it
                takes a pile of numbers and turns it into something you can actually make a decision from.
              </p>
              <p className="text-sm font-semibold text-slate-900 mb-5">
                The question it answers: <span className="font-normal text-slate-600">What is this data telling us — and what should we do about it?</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {['Spotting patterns', 'Predicting what happens next', 'Explaining why', 'Guiding decisions'].map((t) => (
                  <span key={t} className="text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-full px-2.5 py-1">{t}</span>
                ))}
              </div>
            </div>
          </div>

          {/* How they work together */}
          <div className="mt-6 rounded-xl bg-navy-deep p-7 md:p-8">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-semibold mb-4">
              <span className="text-slate-400">Messy data</span>
              <ArrowRight size={15} className="text-sky-400 flex-shrink-0" />
              <span className="text-white">Data Engineering</span>
              <ArrowRight size={15} className="text-sky-400 flex-shrink-0" />
              <span className="text-slate-400">Data you can trust</span>
              <ArrowRight size={15} className="text-sky-400 flex-shrink-0" />
              <span className="text-white">Data Science</span>
              <ArrowRight size={15} className="text-sky-400 flex-shrink-0" />
              <span className="text-slate-400">Decisions you can act on</span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
              The simple version: <span className="text-white font-medium">data engineering gets your data ready; data science figures out what it&apos;s telling you.</span> You need both — data you can trust, and someone to make sense of it.
            </p>
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
                  We bring that same standard to businesses, drone and surveying operations, research
                  teams, and any organization that needs to turn messy, scattered data into decisions it can trust.
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
