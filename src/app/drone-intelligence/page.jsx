import Image from 'next/image';
import Link from 'next/link';
import { Zap, ShieldCheck, Crosshair, BrainCircuit } from 'lucide-react';

// Drone & Geospatial vertical page. FIXED palette (see app/page.jsx) — no dark:
// variants. Keeps the real drone photography (these are photos, not baked-text).

const IMPROVEMENTS = [
  { Icon: Zap,         title: 'Faster collection', desc: 'Capture a site, structure, or property in minutes — not hours or days.' },
  { Icon: ShieldCheck, title: 'Safer inspections', desc: 'Skip the climbing, manual checks, and time spent in hazardous areas.' },
  { Icon: Crosshair,   title: 'Better accuracy',   desc: 'High-resolution imaging, thermal detection, and LiDAR mapping for precise analysis.' },
  { Icon: BrainCircuit, title: 'Smarter decisions', desc: 'Automation and analytics that surface trends, issues, and opportunities faster.' },
];

const INDUSTRIES = [
  { title: 'First Responders', desc: 'Search and rescue, disaster response, thermal victim detection, scene awareness, and rapid aerial assessment.' },
  { title: 'Construction', desc: 'Site-progress tracking, safety documentation, volume measurements, and project monitoring.' },
  { title: 'Mapping & Survey', desc: 'LiDAR mapping, terrain models, topographic views, digital twins, and accurate site surveys.' },
  { title: 'Insurance', desc: 'Roof inspections, storm-damage documentation, property analysis, and claims support.' },
  { title: 'Utilities & Energy', desc: 'Power-line inspections, vegetation monitoring, thermal hotspot detection, and infrastructure reviews.' },
  { title: 'Environmental & Land', desc: 'Land monitoring, habitat review, terrain understanding, and environmental data collection.' },
];

const LEVELS = [
  { level: 'Level 1', title: 'Data Capture', desc: 'Raw aerial photos, video, and visual documentation for basic project visibility.' },
  { level: 'Level 2', title: 'Processed Insights', desc: 'Organized deliverables, marked-up visuals, measurements, and structured reporting.' },
  { level: 'Level 3', title: 'Automated Analytics', desc: 'Automated analysis to detect patterns, flag issues, and improve decisions.' },
  { level: 'Level 4', title: 'Predictive Intelligence', desc: 'Advanced modeling and trend analysis for forward-looking monitoring.' },
];

const PRICING = [
  { name: 'Basic Capture', price: '$150 – $300', desc: 'Aerial photo and video capture for small sites, basic documentation, and visual updates.' },
  { name: 'Standard Inspection', price: '$300 – $750', desc: 'Processed imagery, basic analysis, organized deliverables, and reporting.' },
  { name: 'Advanced Analytics', price: '$750 – $2,000+', desc: 'Thermal or LiDAR visualization, deeper analysis, and automated insights.' },
];

const CALENDAR_URL = 'https://calendar.app.google/1BFgdi2pgjF9vwAB8';

export const metadata = {
  title: 'LiDAR Drone Mapping & Geospatial Analytics | Mullen Analytics',
  description:
    'Drone LiDAR, terrain modeling, mapping, and geospatial analysis for construction, public safety, environmental monitoring, and land management.',
  robots: { index: false, follow: false }, // vertical hidden for now — unlinked from nav/footer/home
};

export default function DroneIntelligencePage() {
  return (
    <div className="bg-white">

      {/* HERO — drone photo + navy overlay */}
      <section className="relative min-h-[520px] flex items-center overflow-hidden">
        <Image src="/drone/hero_section1.jpg" alt="" fill priority className="object-cover" />
        <div className="absolute inset-0 bg-navy-deep/75" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 w-full">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-400 mb-5">Drone &amp; Geospatial</p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-6">
              Drone Intelligence
            </h1>
            <p className="text-lg text-slate-200 leading-relaxed max-w-2xl mb-10">
              Drones, thermal imaging, LiDAR, and automation — turning aerial data into maps, measurements, and
              decisions. For surveying, inspections, disaster response, and everything in between.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/contact"
                className="px-8 py-4 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base text-center transition-colors">
                Get a Quote
              </Link>
              <a href="#pricing"
                className="px-8 py-4 rounded border border-white/30 hover:border-white/60 text-white font-semibold text-base text-center transition-colors">
                See Pricing
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
                More than aerial photos
              </h2>
              <div className="space-y-4">
                <p className="text-base text-slate-700 leading-relaxed">
                  Drones are no longer just for pictures. They&apos;re a fast, safe way to inspect, map,
                  monitor, and measure a site — and gather far more detail than a person on the ground could.
                </p>
                <p className="text-base text-slate-700 leading-relaxed">
                  We pair drone operations with automation, analytics, thermal imaging, and LiDAR to turn raw
                  imagery into decision-ready intelligence.
                </p>
                <p className="text-base text-slate-900 font-semibold leading-relaxed">
                  So you&apos;re not just getting images — you&apos;re getting measurements, clear reporting, and a
                  new way to understand your data.
                </p>
              </div>
            </div>
            <div className="relative h-[400px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
              <Image src="/drone/analytics1.jpg" alt="Drone analytics visualization" fill className="object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT IMPROVES RESULTS — slate-50 */}
      <section className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-4">Why It Works</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">
              How drone technology improves results
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {IMPROVEMENTS.map(({ Icon, title, desc }) => (
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
              From disaster response to job sites
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {INDUSTRIES.map((item) => (
              <div key={item.title} className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <h3 className="text-base font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LEVELS OF ANALYTICS — navy band */}
      <section className="py-24 bg-navy-deep">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-400 mb-4">How Far You Want to Go</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4">Levels of analytics</h2>
            <p className="text-base text-slate-300 leading-relaxed">
              From a simple aerial capture to advanced automated analysis — you pick the depth.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {LEVELS.map((lvl) => (
              <div key={lvl.level} className="bg-navy-surface border border-navy-border rounded-xl p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-sky-400 mb-2">{lvl.level}</p>
                <h3 className="text-base font-bold text-white mb-2">{lvl.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{lvl.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THERMAL & LIDAR — white, image + text */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 relative h-[400px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
              <Image src="/drone/thermal_and_lidar1.jpg" alt="Thermal and LiDAR drone visualization" fill className="object-cover" />
            </div>
            <div className="order-1 lg:order-2">
              <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-4">Deeper Insight</p>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-6">
                Thermal &amp; LiDAR visualization
              </h2>
              <div className="space-y-4">
                <p className="text-base text-slate-700 leading-relaxed">
                  Thermal imaging and LiDAR go well beyond standard photography.
                </p>
                <p className="text-base text-slate-700 leading-relaxed">
                  Thermal imaging detects heat signatures, electrical hotspots, hidden problems, and
                  energy anomalies.
                </p>
                <p className="text-base text-slate-700 leading-relaxed">
                  LiDAR builds highly detailed 3D maps, terrain models, and elevation views for advanced
                  site understanding.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING — slate-50 */}
      <section id="pricing" className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-4">Introductory Pricing</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-4">
              Straightforward, starter-friendly pricing
            </h2>
            <p className="text-base text-slate-700 leading-relaxed">
              We&apos;re expanding our drone services, so pricing is set at the lower end of the market to
              help you get started with the technology.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PRICING.map((tier, i) => (
              <div key={tier.name}
                className={`bg-white rounded-xl p-8 border shadow-sm ${i === 2 ? 'border-blue-600 border-t-[3px]' : 'border-slate-200'}`}>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{tier.name}</h3>
                <p className="text-2xl font-bold text-blue-700 mb-4 tabular-nums">{tier.price}</p>
                <p className="text-sm text-slate-700 leading-relaxed">{tier.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-500 mt-8">
            Custom quotes available for utilities, insurance, municipalities, emergency response, and
            ongoing analytics support.
          </p>
        </div>
      </section>

      {/* FINAL CTA — navy band */}
      <section className="py-28 bg-navy-deep">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight mb-6">
            Upgrade how you collect and understand data
          </h2>
          <p className="text-lg text-slate-300 mb-12 leading-relaxed mx-auto max-w-xl">
            Let&apos;s build a drone, automation, and analytics solution for your organization — from a single flight
            to ongoing monitoring.
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
