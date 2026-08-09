import Image from 'next/image';
import Link from 'next/link';
import { Flame, Satellite, Leaf, ShieldCheck } from 'lucide-react';

// Environmental & Geospatial vertical page. FIXED palette (see app/page.jsx) —
// navy/white/slate, no dark: variants. Mirrors the other industry pages.

export const metadata = {
  title: 'Environmental & Wildfire Analytics | Mullen Analytics',
  description:
    'Wildfire risk prediction, environmental monitoring, remote sensing, and disaster-response analytics for fire and land agencies, counties, utilities, and emergency management.',
};

const CAPABILITIES = [
  { Icon: Flame,       title: 'Wildfire risk prediction', desc: 'Fuel, terrain, and weather-driven models that estimate ignition risk, spread potential, and where to stage resources.' },
  { Icon: Satellite,   title: 'Remote sensing & GIS',     desc: 'Drone, LiDAR, and satellite imagery turned into terrain models, vegetation and land-cover maps, and change detection.' },
  { Icon: Leaf,        title: 'Environmental monitoring',  desc: 'Track air, water, land, and habitat conditions over time — with clear, defensible reporting for stakeholders.' },
  { Icon: ShieldCheck, title: 'Disaster response',         desc: 'Flood, fire, and storm impact assessment and resource planning built for high-consequence, time-critical decisions.' },
];

const SERVED = [
  { title: 'Fire & Land Management', desc: 'Wildfire risk mapping, fuel and vegetation analysis, and pre-season resource planning.' },
  { title: 'Counties & Municipalities', desc: 'Hazard mapping, resilience planning, and environmental reporting for public stakeholders.' },
  { title: 'Utilities & Energy', desc: 'Vegetation-encroachment monitoring, wildfire exposure analysis, and infrastructure risk review.' },
  { title: 'Emergency Management', desc: 'Disaster impact assessment, evacuation and staging support, and post-event analysis.' },
  { title: 'Conservation & Research', desc: 'Habitat and land-cover monitoring, data pipelines, and reproducible environmental modeling.' },
  { title: 'Insurance & Risk', desc: 'Property wildfire and flood exposure scoring, imagery documentation, and claims support.' },
];

const DELIVERABLES = [
  { level: 'Maps', title: 'Risk & terrain maps', desc: 'Wildfire risk, vegetation, land-cover, and elevation maps built from imagery and field data.' },
  { level: 'Models', title: 'Forecasts & early warning', desc: 'Weather- and fuel-driven models that flag rising risk before it becomes an emergency.' },
  { level: 'Dashboards', title: 'Monitoring dashboards', desc: 'Living views of conditions and trends that update as new data comes in.' },
  { level: 'Reports', title: 'Field-ready reporting', desc: 'Clear, defensible reports and exports for leadership, grants, and public accountability.' },
];

const CALENDAR_URL = 'https://calendar.app.google/1BFgdi2pgjF9vwAB8';

export default function EnvironmentalPage() {
  return (
    <div className="bg-white">

      {/* HERO — navy gradient */}
      <section className="relative min-h-[520px] flex items-center overflow-hidden bg-navy-deep">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-deep via-navy-deep to-blue-950" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 w-full">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-400 mb-5">Environmental &amp; Geospatial</p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-6">
              Environmental &amp; Wildfire Analytics
            </h1>
            <p className="text-lg text-slate-200 leading-relaxed max-w-2xl mb-10">
              Wildfire risk, remote sensing, and environmental monitoring — turning terrain, weather, and imagery
              into maps, forecasts, and decisions for the agencies and organizations that protect land and people.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/contact"
                className="px-8 py-4 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base text-center transition-colors">
                Get a Quote
              </Link>
              <a href="#deliverables"
                className="px-8 py-4 rounded border border-white/30 hover:border-white/60 text-white font-semibold text-base text-center transition-colors">
                What We Deliver
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT IT IS — white, text + image */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-4">What It Is</p>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-6">
                Environmental data you can act on
              </h2>
              <div className="space-y-4">
                <p className="text-base text-slate-700 leading-relaxed">
                  Environmental risk is a data problem: terrain, fuel, weather, imagery, and history all shape what
                  happens next. Most of that data sits unused, in formats no one has time to reconcile.
                </p>
                <p className="text-base text-slate-700 leading-relaxed">
                  We pair geospatial analysis, remote sensing, and forecasting to turn that raw data into wildfire
                  risk maps, monitoring dashboards, and early-warning models.
                </p>
                <p className="text-base text-slate-900 font-semibold leading-relaxed">
                  So you&apos;re not reacting to conditions — you&apos;re anticipating them, with evidence you can defend.
                </p>
              </div>
            </div>
            <div className="relative h-[400px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
              <Image src="/images/portfolio-environmental.jpg" alt="Environmental and geospatial analytics visualization" fill className="object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* CAPABILITIES — slate-50 */}
      <section className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-4">What We Do</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">
              From raw terrain and imagery to decisions
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {CAPABILITIES.map(({ Icon, title, desc }) => (
              <div key={title} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <div className="w-11 h-11 rounded-lg bg-blue-600/10 flex items-center justify-center mb-4">
                  <Icon size={20} strokeWidth={1.75} className="text-blue-700" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHO WE WORK WITH — white */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-4">Who We Work With</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">
              Built for the people protecting land and communities
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVED.map((item) => (
              <div key={item.title} className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <h3 className="text-base font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT WE DELIVER — navy band */}
      <section id="deliverables" className="py-24 bg-navy-deep">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-400 mb-4">What You Get</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4">What we deliver</h2>
            <p className="text-base text-slate-300 leading-relaxed">
              From a one-time risk assessment to ongoing monitoring — you pick the depth.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {DELIVERABLES.map((d) => (
              <div key={d.level} className="bg-navy-surface border border-navy-border rounded-xl p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-sky-400 mb-2">{d.level}</p>
                <h3 className="text-base font-bold text-white mb-2">{d.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA — navy band */}
      <section className="py-28 bg-navy-deep border-t border-navy-border">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight mb-6">
            Get ahead of environmental risk
          </h2>
          <p className="text-lg text-slate-300 mb-12 leading-relaxed mx-auto max-w-xl">
            Let&apos;s turn your terrain, imagery, and history into wildfire risk maps, monitoring, and early
            warning — from a single assessment to an ongoing program.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact"
              className="px-10 py-5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base text-center transition-colors">
              Request a Quote
            </Link>
            <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer"
              className="px-10 py-5 rounded border border-navy-border hover:border-slate-500 text-slate-200 hover:text-white font-semibold text-base text-center transition-colors">
              Schedule a Call
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
