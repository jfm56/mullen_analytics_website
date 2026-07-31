import Link from 'next/link';
import {
  Package, RefreshCw, Compass, Check, ShieldCheck,
} from 'lucide-react';

// Pricing — simple & quote-first. Same FIXED palette as the home page (see
// app/page.jsx). Most work is custom-scoped, so we show a few plain "ways to
// work together" with light starting-at ranges rather than a wall of prices.

export const metadata = {
  title: 'Pricing | Mullen Analytics & Data Solutions',
  description:
    'Simple, quote-first pricing for analytics, data engineering, drone, and automation work — plus ready-to-use platforms. Most engagements are custom-scoped to what you actually need. Start with a strategy call.',
};

const CALENDAR_URL = 'https://calendar.app.google/1BFgdi2pgjF9vwAB8';

const WAYS = [
  {
    Icon: Package,
    cadence: 'One-time',
    name: 'Projects',
    price: 'Starting at $2,500',
    sub: 'A defined piece of work with a clear finish line.',
    points: [
      'A dashboard or report built around your data',
      'Getting your data cleaned up, connected, and reliable',
      'A drone survey, map, or inspection',
      'A forecasting or prediction model',
      'Automating a manual, repetitive task',
    ],
    cta: 'Scope a project',
  },
  {
    Icon: RefreshCw,
    cadence: 'Monthly',
    name: 'Ongoing analytics & support',
    price: 'From $249/mo',
    sub: 'Continuous insight and a team you can reach — not a one-off.',
    points: [
      'Managed dashboards and regular reporting',
      'New questions answered as they come up',
      'Models kept accurate and up to date',
      'Message our team whenever you need us',
    ],
    cta: 'Talk about ongoing work',
    highlight: true,
    badge: 'Most common',
  },
  {
    Icon: Compass,
    cadence: 'Hourly',
    name: 'Advisory & strategy',
    price: '$150/hr',
    sub: 'Direction and expertise, on demand.',
    points: [
      'Strategy sessions and planning',
      'A second opinion on your data or approach',
      'Hands-on help when your team is stretched',
      'Clear guidance on where to start',
    ],
    cta: 'Book advisory time',
  },
];

const PRICE_FACTORS = [
  'How much data you have, and what shape it’s in',
  'How much is a one-time build versus ongoing work',
  'Whether it runs in our secure cloud or inside your own walls',
  'How hands-on you need us to be',
];

export default function PricingPage() {
  return (
    <div className="bg-white">

      {/* HERO — navy band */}
      <section className="bg-navy-deep">
        <div className="max-w-7xl mx-auto px-6 py-24 md:py-28">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-400 mb-5">Pricing</p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-6">
              Pricing scoped to what you actually need
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed max-w-2xl mb-10">
              Most of what we do is built for you, so most engagements are custom-quoted. Here is how we
              structure the work — and exactly what a fair quote is built on. No surprises.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer"
                className="px-8 py-4 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base text-center transition-colors">
                Schedule a strategy call
              </a>
              <Link href="/contact"
                className="px-8 py-4 rounded border border-navy-border hover:border-slate-500 text-slate-200 hover:text-white font-semibold text-base text-center transition-colors">
                Contact us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* WAYS TO WORK TOGETHER — white */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-4">Ways to Work Together</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-4">
              Three simple ways to start
            </h2>
            <p className="text-base text-slate-700 leading-relaxed">
              Whether you need one thing built, ongoing help, or just a little direction — there is a
              straightforward way in. Prices below are starting points; most work is quoted to fit.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            {WAYS.map(({ Icon, cadence, name, price, sub, points, cta, highlight, badge }) => (
              <div
                key={name}
                className={`relative flex flex-col rounded-2xl p-7 ${
                  highlight
                    ? 'bg-white border-2 border-blue-600 shadow-lg shadow-blue-600/10'
                    : 'bg-slate-50 border border-slate-200'
                }`}
              >
                {badge && (
                  <span className="absolute -top-3 left-7 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider bg-blue-600 text-white">
                    {badge}
                  </span>
                )}
                <div className="w-11 h-11 rounded-lg bg-blue-600/10 flex items-center justify-center mb-4">
                  <Icon size={20} strokeWidth={1.75} className="text-blue-700" />
                </div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-sky-600 mb-2">{cadence}</p>
                <h3 className="text-lg font-bold text-slate-900 mb-1">{name}</h3>
                <p className="text-2xl font-bold text-slate-900 tracking-tight mb-3">{price}</p>
                <p className="text-sm text-slate-700 leading-relaxed mb-5">{sub}</p>
                <ul className="space-y-2.5 mb-7 flex-1">
                  {points.map((pt) => (
                    <li key={pt} className="flex items-start gap-3">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 mt-0.5 bg-blue-600/10">
                        <Check size={13} strokeWidth={3} className="text-blue-700" />
                      </span>
                      <span className="text-sm text-slate-700">{pt}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/contact"
                  className={`block text-center px-5 py-3 rounded font-semibold text-sm transition-colors ${
                    highlight
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : 'bg-white hover:bg-slate-100 text-slate-900 border border-slate-200'
                  }`}
                >
                  {cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW WE PRICE — slate-50 */}
      <section className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-4">How We Price</p>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-6">
                A fair price depends on what you need
              </h2>
              <div className="space-y-5">
                <p className="text-base text-slate-700 leading-relaxed">
                  We keep pricing honest and simple. Instead of forcing your work into a rigid plan, we
                  look at a few practical things and give you a clear, fixed quote.
                </p>
                <p className="text-base text-slate-700 leading-relaxed">
                  You will know the full price before any work starts — no surprise line items, no
                  billing you did not agree to.
                </p>
              </div>
            </div>
            <div className="grid gap-3 lg:mt-4">
              {PRICE_FACTORS.map((item) => (
                <div key={item} className="flex items-center gap-3 px-5 py-4 rounded-xl bg-white border border-slate-200">
                  <Check size={16} strokeWidth={2.5} className="text-blue-700 flex-shrink-0" />
                  <span className="text-sm font-medium text-slate-700">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* REGULATED / ON-PREM — white */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 md:p-10">
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center mb-5">
              <ShieldCheck size={24} strokeWidth={1.75} className="text-blue-700" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-3">Regulated &amp; Sensitive Data</p>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight mb-4">
              We can run it inside your own walls
            </h2>
            <p className="text-base text-slate-700 leading-relaxed mb-6 max-w-2xl">
              Handling PHI or other sensitive data? For healthcare, EMS, and research teams that need it,
              we deploy and run everything inside your own environment — your data never leaves. These
              engagements are scoped and quoted to your setup and requirements.
            </p>
            <Link href="/contact"
              className="inline-block px-7 py-3.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm text-center transition-colors">
              Ask about secure deployment
            </Link>
          </div>
        </div>
      </section>

      {/* FINAL CTA — navy band */}
      <section className="py-28 bg-navy-deep">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight mb-6">
            Not sure what your project should cost?
          </h2>
          <p className="text-lg text-slate-300 mb-12 leading-relaxed mx-auto max-w-xl">
            Tell us what you are trying to solve. We will recommend the right approach and give you a
            clear, no-pressure quote — often with a quick look at what it means for your own data.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer"
              className="px-10 py-5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base text-center transition-colors">
              Schedule a strategy call
            </a>
            <Link href="/contact"
              className="px-10 py-5 rounded border border-navy-border hover:border-slate-500 text-slate-200 hover:text-white font-semibold text-base text-center transition-colors">
              Contact us
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
