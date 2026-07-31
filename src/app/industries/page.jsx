import Link from 'next/link';
import {
  TrendingUp, Users, Target, Gauge, LayoutDashboard, Zap, Check,
} from 'lucide-react';

// Business & Commercial vertical page (the nav "Business & Commercial" points
// here). Same FIXED palette as the home page — see app/page.jsx.

const CALENDAR_URL = 'https://calendar.app.google/1BFgdi2pgjF9vwAB8';

const USE_CASES = [
  { Icon: TrendingUp,     title: 'Forecast demand & revenue', desc: 'See what is coming — sales, demand, cash flow — so you can plan staffing, inventory, and budgets with confidence.' },
  { Icon: Users,          title: 'Keep more customers',       desc: 'Spot who is likely to leave before they do, and focus your effort where it protects the most revenue.' },
  { Icon: Target,         title: 'Know your customers',       desc: 'Who your best customers are, what they are worth, and where to find more like them.' },
  { Icon: Gauge,          title: 'Run leaner operations',     desc: 'Find the bottlenecks, waste, and slowdowns hiding in your day-to-day numbers.' },
  { Icon: LayoutDashboard, title: 'Dashboards leaders use',   desc: 'The numbers that matter, in one clear place — so decisions do not wait on a spreadsheet.' },
  { Icon: Zap,            title: 'Automate the busywork',     desc: 'Stop rebuilding the same reports by hand. Let the data pull itself together and update on its own.' },
];

const VALUE_POINTS = [
  { title: 'Explained in plain English', desc: 'You get clear answers you can act on — not a data-science lecture.' },
  { title: 'Built around your business', desc: 'Your goals, your systems, your team — not a one-size-fits-all template.' },
  { title: 'Focused on the bottom line', desc: 'Revenue, cost, retention, efficiency — the numbers that actually move your business.' },
  { title: 'Yours to keep', desc: 'Practical systems your team can run and build on, long after we are done.' },
];

export default function BusinessPage() {
  return (
    <div className="bg-white">

      {/* HERO — navy band */}
      <section className="bg-navy-deep">
        <div className="max-w-7xl mx-auto px-6 py-24 md:py-28">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-400 mb-5">Business &amp; Commercial</p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-6">
              Analytics that grow your business
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed max-w-2xl mb-10">
              From forecasting demand to keeping customers, we help businesses turn the data they already
              have into decisions that move revenue, cost, and growth — explained plainly, built to last.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer"
                className="px-8 py-4 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base text-center transition-colors">
                Schedule a Strategy Call
              </a>
              <Link href="/capabilities"
                className="px-8 py-4 rounded border border-navy-border hover:border-slate-500 text-slate-200 hover:text-white font-semibold text-base text-center transition-colors">
                See our capabilities
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT WE HELP WITH — white */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-4">What We Help With</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-4">
              Turn the data you already have into an advantage
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              Most businesses are sitting on more useful data than they realize. Here is where we help
              put it to work.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {USE_CASES.map(({ Icon, title, desc }) => (
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

      {/* WHY US — slate-50 */}
      <section className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-4">Why Us</p>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-6">
                Serious analytics, in plain English
              </h2>
              <p className="text-base text-slate-600 leading-relaxed">
                You do not need to speak data to get value from it. We handle the technical side and hand
                you clear answers, practical tools, and decisions you can stand behind.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
              {VALUE_POINTS.map((v) => (
                <div key={v.title} className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check size={16} strokeWidth={2.5} className="text-blue-700" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 mb-0.5">{v.title}</p>
                    <p className="text-sm text-slate-600 leading-relaxed">{v.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA — navy band */}
      <section className="py-28 bg-navy-deep">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight mb-6">
            Let&apos;s put your data to work
          </h2>
          <p className="text-lg text-slate-300 mb-12 leading-relaxed mx-auto max-w-xl">
            Tell us what you are trying to figure out or improve, and we will come back with a clear,
            practical next step.
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
