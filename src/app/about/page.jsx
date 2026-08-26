import Image from 'next/image';
import Link from 'next/link';
import { Check, ShieldCheck, Users, BadgeCheck, Lock } from 'lucide-react';

// About uses the same FIXED palette as the home page (always light, with navy
// bands) — see the note in app/page.jsx. The hero is HTML (not a baked-text
// image) so the positioning stays broad and editable.

const TRUST_PILLARS = [
  { Icon: ShieldCheck, label: 'Veteran-Owned & Operated' },
  { Icon: Users,       label: 'Real-World Operational Experience' },
  { Icon: BadgeCheck,  label: 'Explainable Results You Can Trust' },
  { Icon: Lock,        label: 'Security & Compliance Focused' },
];

const APPROACH_ITEMS = [
  { title: 'Easy to understand', sub: 'You can see how it reached its answer — not just take it on faith.' },
  { title: 'Grounded in how you actually work', sub: 'Built around your operations, not a generic template.' },
  { title: 'Something you can defend', sub: 'Clear enough to stand up in an audit, a board meeting, or public review.' },
  { title: 'Built to last', sub: 'Designed to keep working and stay useful as things change.' },
];

const CALENDAR_URL = 'https://calendar.app.google/1BFgdi2pgjF9vwAB8';

export const metadata = {
  title: 'About Mullen Analytics | Veteran-Owned Data & Analytics',
  description:
    'Veteran-owned and founded by former first responders, Mullen Analytics & Data Solutions builds explainable, defensible analytics for high-consequence operations.',
};

export default function AboutPage() {
  return (
    <div className="bg-white">

      {/* HERO — navy band (HTML, so positioning stays broad + editable) */}
      <section className="bg-navy-deep">
        <div className="max-w-7xl mx-auto px-6 py-24 md:py-28">
          <div className="max-w-3xl mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-400 mb-5">About Mullen Analytics</p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-6">
              Turning data into solutions
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed max-w-2xl">
              Mullen Analytics is a veteran-owned analytics and automation consultancy. We came up in
              high-pressure operations — and we bring that same standard to any organization that needs
              answers it can trust.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-navy-border pt-10 max-w-4xl">
            {TRUST_PILLARS.map(({ Icon, label }) => (
              <div key={label} className="flex flex-col items-start gap-2.5">
                <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center">
                  <Icon size={20} strokeWidth={1.75} className="text-sky-400" />
                </div>
                <p className="text-xs font-semibold text-slate-300 leading-snug">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHO WE ARE — white */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-4">Who We Are</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-8">
              We know how much rides on your data
            </h2>
            <div className="space-y-5">
              <p className="text-base text-slate-600 leading-relaxed">
                The right call usually comes down to the data behind it — staffing a shift, planning a
                budget, mapping a site, improving an outcome. We&apos;ve seen how much can depend on getting
                it right.
              </p>
              <p className="text-base text-slate-600 leading-relaxed">
                So we don&apos;t treat analytics as an academic exercise. We build it knowing real decisions
                ride on what the numbers say — and that the people acting on them need to trust what
                they&apos;re looking at.
              </p>
              <p className="text-base text-slate-600 leading-relaxed">
                We work with businesses, first responders, healthcare, and
                research groups — anyone who needs their data organized, trustworthy, and turned into
                clear answers.
              </p>
              <p className="text-base text-slate-900 font-semibold leading-relaxed">
                We don&apos;t build dashboards just to build dashboards. We build practical systems
                people actually use, leaders can stand behind, and organizations can grow with.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* OUR APPROACH — slate-50 */}
      <section className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-4">Our Approach</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-6">
              Analytics that hold up in the real world
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              When decisions ride on your data — staffing, budgets, safety, response times — a bad
              model isn&apos;t just inconvenient. So everything we build is designed to be:
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6 max-w-4xl mb-10">
            {APPROACH_ITEMS.map((item) => (
              <div key={item.title} className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check size={16} strokeWidth={2.5} className="text-blue-700" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 mb-0.5">{item.title}</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-base text-slate-600 leading-relaxed max-w-2xl">
            And we work with the people who&apos;ll actually use it — the operators, directors, and
            department heads, not just IT — so the system gets adopted and acted on.
          </p>
        </div>
      </section>

      {/* FOUNDER — white (keeps the bottom of the page from being one big navy block) */}
      <section className="py-24 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-14 border-l-[3px] border-sky-500 pl-5">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-3">About the Founder</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Experience first, credentials second</h2>
          </div>
          <div className="grid lg:grid-cols-5 gap-14 items-start">
            <div className="lg:col-span-2">
              <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                <Image src="/head-shot.jpeg" alt="James Mullen, Founder — veteran and former paramedic"
                  width={480} height={580} className="w-full object-cover" priority
                  sizes="(max-width: 1024px) 100vw, 40vw" />
              </div>
            </div>
            <div className="lg:col-span-3 space-y-6">
              <p className="text-base text-slate-600 leading-relaxed">
                Mullen Analytics was founded by James Mullen — a veteran, former paramedic, and data
                scientist with over a decade in high-pressure operational roles.
              </p>
              <p className="text-base text-slate-600 leading-relaxed">
                He served in the military and worked in emergency medical services before moving into
                data science — to help organizations make better decisions with the data they already have.
              </p>
              <p className="text-base text-slate-600 leading-relaxed">
                He holds a bachelor&apos;s in Biology and a master&apos;s in Data Science, with a focus on
                machine learning, forecasting, and automation.
              </p>
              <div className="mt-8 p-6 rounded-xl bg-blue-50 border border-blue-200">
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-lg bg-blue-600/10 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck size={18} strokeWidth={2} className="text-blue-700" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 mb-1">Mullen Analytics is veteran-owned.</p>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Our work is built on real operational credibility — not just technical credentials.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA — navy band */}
      <section className="py-28 bg-navy-deep">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight mb-6">
            Let&apos;s turn your data into better decisions
          </h2>
          <p className="text-lg text-slate-300 mb-12 leading-relaxed mx-auto max-w-xl">
            Whatever your field — business, public safety, healthcare, or research —
            if you want to improve operations, staffing, or decision-making, we&apos;d welcome the conversation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact"
              className="px-10 py-5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base text-center transition-colors">
              Get in touch
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
