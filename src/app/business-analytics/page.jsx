import Link from 'next/link';
import {
  BarChart3, Target, BrainCircuit, Check, ArrowRight,
  Gauge, TrendingUp, Boxes,
} from 'lucide-react';
import ScheduleCTA from '../../components/ScheduleCTA';

// Business Analytics landing page. Same FIXED palette as the home / vertical pages
// (see app/page.jsx). Structured around real search phrases from paid-search intent:
// "outsourced data analytics", "business metrics & KPI dashboards",
// "sales performance analysis", "data science for business".

const CALENDAR_URL = 'https://calendar.app.google/1BFgdi2pgjF9vwAB8';

const KPI_METRICS = [
  'Revenue', 'Cost', 'Margin', 'Sales', 'Customer retention',
  'Operational efficiency', 'Forecast vs. actual', 'Staffing & utilization', 'Custom KPIs',
];

const SALES_POINTS = [
  'Sales trends over time', 'Revenue by product or service', 'Performance by territory or location',
  'Customer segmentation', 'Sales forecasting', 'Growth & decline detection',
  'Profitability analysis', 'What actually drives performance',
];

const DATA_SCIENCE = [
  { title: 'Forecasting & prediction', desc: 'Project revenue, demand, and staffing from your own history — not gut feel.' },
  { title: 'Statistical analysis', desc: 'Understand what is really moving your numbers, with the uncertainty made clear.' },
  { title: 'Experiments & A/B testing', desc: 'Measure whether a change actually worked before you roll it out everywhere.' },
  { title: 'Customer segmentation', desc: 'Group customers by behavior and value so you can focus effort where it pays.' },
  { title: 'Anomaly detection', desc: 'Catch unusual spikes, drops, and errors early — before they become problems.' },
  { title: 'Optimization', desc: 'Find the best allocation of budget, inventory, and people against your goals.' },
];

const MANAGED_INCLUDES = [
  'Dashboards built and maintained for you', 'Forecasting and predictive models',
  'Automated, scheduled reporting', 'Model monitoring and refreshes',
  'Data pipelines and data-quality checks', 'An analyst on call for ad-hoc questions',
];

export const metadata = {
  title: 'Business Analytics Services & KPI Dashboards | Mullen Analytics',
  description:
    'Business analytics services — outsourced data analytics, KPI dashboards, sales performance analysis, and data science for business. Forecasting, reporting, and predictive modeling that turn data into decisions, without building an internal team.',
};

export default function BusinessAnalyticsPage() {
  return (
    <div className="bg-white">

      {/* HERO — navy band */}
      <section className="bg-navy-deep">
        <div className="max-w-7xl mx-auto px-6 py-24 md:py-28">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-400 mb-5">Business &amp; Commercial</p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-6">
              Business Analytics Services That Turn Data Into Decisions
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed max-w-2xl mb-10">
              Dashboards, forecasting, KPI reporting, and predictive modeling for companies that want the value
              of an analytics team — without hiring one. We turn scattered data into clear, trusted decisions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <ScheduleCTA href={CALENDAR_URL}
                className="px-8 py-4 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base text-center transition-colors">
                Schedule a Strategy Call
              </ScheduleCTA>
              <Link href="/business-dashboard-example"
                className="px-8 py-4 rounded border border-navy-border hover:border-slate-500 text-slate-200 hover:text-white font-semibold text-base text-center transition-colors inline-flex items-center justify-center gap-2">
                See a live dashboard example <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* OUTSOURCED DATA ANALYTICS — white, major section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-4">Managed Analytics</p>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-6">
                Outsourced Data Analytics Services
              </h2>
              <div className="space-y-5">
                <p className="text-base text-slate-600 leading-relaxed">
                  Not every organization needs — or wants — to build an internal analytics department. Outsourced
                  data analytics gives you the same capability as an ongoing service: dashboards, forecasting,
                  reporting, and model monitoring, delivered and maintained for you.
                </p>
                <p className="text-base text-slate-600 leading-relaxed">
                  You get an analytics team on demand, at a fraction of the cost of hiring, with no ramp-up and
                  no long-term overhead — so leaders spend time acting on insight instead of building the plumbing.
                </p>
                <Link href="/pricing" className="inline-flex items-center gap-1.5 text-blue-600 font-semibold hover:text-blue-700 transition-colors">
                  See Managed Analytics plans <ArrowRight size={16} />
                </Link>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8">
              <p className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-5">What&apos;s included</p>
              <ul className="space-y-3.5">
                {MANAGED_INCLUDES.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Check size={18} className="text-blue-600 mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                    <span className="text-base text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* KPI DASHBOARDS — slate band */}
      <section className="py-24 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-4">Dashboards &amp; Reporting</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-5">
              Business Metrics &amp; KPI Dashboards
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              Every team drowns in numbers and starves for answers. We design KPI dashboards around the handful of
              metrics that actually drive your business — clear, current, and something leadership can act on at a glance.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {KPI_METRICS.map((m) => (
              <div key={m} className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center gap-3">
                <Gauge size={18} className="text-sky-600 flex-shrink-0" strokeWidth={1.75} />
                <span className="text-sm font-semibold text-slate-800">{m}</span>
              </div>
            ))}
          </div>
          <Link href="/business-dashboard-example"
            className="mt-10 inline-flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-700 transition-colors">
            See an example dashboard <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* SALES PERFORMANCE — white */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-4">Named Service</p>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-6">
                Sales Performance Analysis
              </h2>
              <p className="text-base text-slate-600 leading-relaxed mb-4">
                Where is revenue coming from, where is it slipping, and why? We turn your sales data into a clear
                picture of what is working, what is not, and where to focus next quarter.
              </p>
              <div className="flex items-center gap-3 text-slate-400">
                <TrendingUp size={20} strokeWidth={1.75} className="text-sky-600" />
                <BarChart3 size={20} strokeWidth={1.75} className="text-sky-600" />
                <Target size={20} strokeWidth={1.75} className="text-sky-600" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {SALES_POINTS.map((p) => (
                <div key={p} className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                  <Check size={17} className="text-blue-600 mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                  <span className="text-sm text-slate-700">{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* DATA SCIENCE FOR BUSINESS — slate band */}
      <section className="py-24 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-4">Beyond the Dashboard</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-5">
              Data Science for Business
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              When a dashboard tells you <em>what</em> happened, data science tells you what is likely to happen next —
              and what to do about it. No jargon required; just clearer decisions backed by your own numbers.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {DATA_SCIENCE.map(({ title, desc }) => (
              <div key={title} className="bg-white border border-slate-200 rounded-2xl p-6">
                <div className="w-11 h-11 rounded-lg bg-sky-500/10 flex items-center justify-center mb-4">
                  <BrainCircuit size={22} strokeWidth={1.75} className="text-sky-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-slate-500">
            Explore the full capability set on our <Link href="/capabilities" className="text-blue-600 font-semibold hover:text-blue-700">capabilities page</Link>.
          </p>
        </div>
      </section>

      {/* CTA — navy band */}
      <section className="bg-navy-deep">
        <div className="max-w-4xl mx-auto px-6 py-24 text-center">
          <div className="w-14 h-14 rounded-xl bg-sky-500/10 flex items-center justify-center mx-auto mb-6">
            <Boxes size={26} strokeWidth={1.75} className="text-sky-400" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4">
            Want this built around your company&apos;s data?
          </h2>
          <p className="text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto mb-10">
            Bring your questions and your spreadsheets. We&apos;ll show you what a dashboard, forecast, or
            KPI report built on your numbers would actually look like.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <ScheduleCTA href={CALENDAR_URL}
              className="px-8 py-4 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base text-center transition-colors">
              Schedule a Free Strategy Call
            </ScheduleCTA>
            <Link href="/business-dashboard-example"
              className="px-8 py-4 rounded border border-navy-border hover:border-slate-500 text-slate-200 hover:text-white font-semibold text-base text-center transition-colors inline-flex items-center justify-center gap-2">
              See the dashboard example <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
