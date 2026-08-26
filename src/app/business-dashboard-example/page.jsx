import Link from 'next/link';
import { ArrowRight, TrendingUp, Info } from 'lucide-react';
import ScheduleCTA from '../../components/ScheduleCTA';

// Business dashboard EXAMPLE — a lead-generation asset that shows, rather than tells,
// what we build. All figures are fictional and de-identified, and they reconcile:
// Jan–Sep actual ($3.61M) + Q4 forecast ($1.21M) = ~$4.8M revenue, +12.4% YoY.
// Static charts (CSS/SVG) so the page stays a fast, SEO-clean server component.

const CALENDAR_URL = 'https://calendar.app.google/1BFgdi2pgjF9vwAB8';

const MONTHLY = [
  { m: 'Jan', v: 340 }, { m: 'Feb', v: 360 }, { m: 'Mar', v: 378 },
  { m: 'Apr', v: 372 }, { m: 'May', v: 405 }, { m: 'Jun', v: 420 },
  { m: 'Jul', v: 432 }, { m: 'Aug', v: 448 }, { m: 'Sep', v: 455 },
  { m: 'Oct', v: 400, forecast: true }, { m: 'Nov', v: 410, forecast: true }, { m: 'Dec', v: 400, forecast: true },
];
const MAX = Math.max(...MONTHLY.map((d) => d.v));

const KPIS = [
  { label: 'Revenue (FY)',      value: '$4.8M',  sub: 'actual + forecast' },
  { label: 'YoY Growth',        value: '+12.4%', sub: 'vs. $4.29M last year', up: true },
  { label: 'Forecasted Q4',     value: '$1.2M',  sub: 'Oct–Dec projection' },
  { label: 'Customer Retention', value: '68%',   sub: 'trailing 12 months' },
  { label: 'Gross Margin',      value: '18%',    sub: '+1.6 pts YoY', up: true },
  { label: 'Top Region',        value: 'Northeast', sub: '31% of revenue' },
];

const SEGMENTS = [
  { label: 'Enterprise',  pct: 42, color: '#2563eb' },
  { label: 'Mid-Market',  pct: 31, color: '#0ea5e9' },
  { label: 'SMB',         pct: 19, color: '#38bdf8' },
  { label: 'New logos',   pct: 8,  color: '#7dd3fc' },
];

// actual = Jan–Sep, forecast line continues Sep→Dec (shares the Sep point)
const pt = (i, v) => `${((i / 11) * 100).toFixed(1)},${(40 - (v / MAX) * 34).toFixed(1)}`;
const actualPts = MONTHLY.slice(0, 9).map((d, i) => pt(i, d.v)).join(' ');
const forecastPts = MONTHLY.slice(8).map((d, i) => pt(i + 8, d.v)).join(' ');

export const metadata = {
  title: 'Business Metrics Dashboard Example | Mullen Analytics',
  description:
    'A live example of a business metrics dashboard — revenue, YoY growth, sales forecast vs. actual, customer segments, and monthly sales trends. See the kind of KPI dashboard we build for your data.',
};

export default function BusinessDashboardExamplePage() {
  return (
    <div className="bg-slate-50">

      {/* HEADER — navy band */}
      <section className="bg-navy-deep">
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-400 mb-4">Example Dashboard</p>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight mb-4 max-w-3xl">
            A business metrics dashboard, built the way we build yours
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed max-w-2xl">
            Revenue, growth, forecast vs. actual, segments, and trends — in one view leadership can act on.
            The numbers below are illustrative, but the format is exactly what we deliver.
          </p>
        </div>
      </section>

      {/* DASHBOARD */}
      <section className="max-w-7xl mx-auto px-6 py-14">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <Info size={14} /> Illustrative example — fictional, de-identified data.
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {KPIS.map((k) => (
            <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">{k.label}</p>
              <p className={`text-2xl font-bold tracking-tight ${k.up ? 'text-emerald-600' : 'text-slate-900'}`}>{k.value}</p>
              <p className="text-[11px] text-slate-400 mt-1">{k.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Monthly Sales Trends — bars */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="text-base font-bold text-slate-900">Monthly Sales Trends</h2>
              <span className="text-xs text-slate-400">$ thousands · actual + forecast</span>
            </div>
            <div className="flex items-end gap-2 h-52">
              {MONTHLY.map((d) => (
                <div key={d.m} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full flex items-end justify-center" style={{ height: '100%' }}>
                    <div
                      className="w-full rounded-t transition-colors"
                      style={{
                        height: `${(d.v / MAX) * 100}%`,
                        backgroundColor: d.forecast ? '#bae6fd' : '#2563eb',
                        backgroundImage: d.forecast
                          ? 'repeating-linear-gradient(45deg,#bae6fd,#bae6fd 4px,#e0f2fe 4px,#e0f2fe 8px)'
                          : 'none',
                      }}
                      title={`${d.m}: $${d.v}K${d.forecast ? ' (forecast)' : ''}`}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">{d.m}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-5 mt-5 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#2563eb' }} /> Actual</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ backgroundImage: 'repeating-linear-gradient(45deg,#bae6fd,#bae6fd 4px,#e0f2fe 4px,#e0f2fe 8px)' }} /> Forecast</span>
            </div>
          </div>

          {/* Customer Segments */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-base font-bold text-slate-900 mb-6">Customer Segments</h2>
            <div className="space-y-5">
              {SEGMENTS.map((s) => (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-slate-700">{s.label}</span>
                    <span className="text-sm font-bold text-slate-900 tabular-nums">{s.pct}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actual vs Forecast — line */}
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="text-base font-bold text-slate-900">Sales Forecast — Actual vs. Projected</h2>
              <span className="text-xs text-slate-400 flex items-center gap-1"><TrendingUp size={13} /> Q4 forecast $1.2M</span>
            </div>
            <svg viewBox="0 0 100 42" preserveAspectRatio="none" className="w-full h-44" role="img" aria-label="Actual vs forecast revenue line chart">
              {[0.25, 0.5, 0.75].map((g) => (
                <line key={g} x1="0" x2="100" y1={40 - g * 34} y2={40 - g * 34} stroke="#f1f5f9" strokeWidth="0.4" />
              ))}
              <polyline points={actualPts} fill="none" stroke="#2563eb" strokeWidth="1.1" strokeLinejoin="round" strokeLinecap="round" />
              <polyline points={forecastPts} fill="none" stroke="#38bdf8" strokeWidth="1.1" strokeDasharray="2 1.5" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
            <div className="flex justify-between mt-1 px-0.5">
              {MONTHLY.map((d) => <span key={d.m} className="text-[10px] text-slate-400">{d.m}</span>)}
            </div>
            <div className="flex items-center gap-5 mt-4 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-4 h-0.5" style={{ backgroundColor: '#2563eb' }} /> Actual (Jan–Sep)</span>
              <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed" style={{ borderColor: '#38bdf8' }} /> Forecast (Q4)</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA — navy band */}
      <section className="bg-navy-deep">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4">
            Want this built around your company&apos;s data?
          </h2>
          <p className="text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto mb-10">
            Send us your spreadsheets and the questions you keep asking. On a free strategy call we&apos;ll
            show you what your revenue, forecast, and KPI dashboard would actually look like.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <ScheduleCTA href={CALENDAR_URL}
              className="px-8 py-4 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base text-center transition-colors">
              Schedule a Free Strategy Call
            </ScheduleCTA>
            <Link href="/business-analytics"
              className="px-8 py-4 rounded border border-navy-border hover:border-slate-500 text-slate-200 hover:text-white font-semibold text-base text-center transition-colors inline-flex items-center justify-center gap-2">
              Explore business analytics services <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
