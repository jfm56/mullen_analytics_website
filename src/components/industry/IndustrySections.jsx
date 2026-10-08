import Link from 'next/link';
import { Check } from 'lucide-react';

export function IndustryHero({
  eyebrow,
  title,
  subheadline,
  description,
  trustPillars,
  calendarUrl,
}) {
  return (
    <section className="bg-navy-deep">
      <div className="max-w-7xl mx-auto px-6 py-24 md:py-28">
        <div className="max-w-3xl mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-400 mb-5">{eyebrow}</p>
          <h1 className={`text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight ${subheadline ? 'mb-4' : 'mb-6'}`}>
            {title}
          </h1>
          {subheadline && (
            <p className="text-xl md:text-2xl text-sky-300 font-semibold leading-snug mb-6 max-w-2xl">
              {subheadline}
            </p>
          )}
          <p className="text-lg text-slate-300 leading-relaxed max-w-2xl">{description}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-navy-border pt-10 max-w-4xl">
          {trustPillars.map(({ Icon, label }) => (
            <div key={label} className="flex flex-col items-start gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center">
                <Icon size={20} strokeWidth={1.75} className="text-sky-400" />
              </div>
              <p className="text-xs font-semibold text-slate-300 leading-snug">{label}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-4 mt-12">
          <a href={calendarUrl} target="_blank" rel="noopener noreferrer"
            className="px-8 py-4 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base text-center transition-colors">
            Schedule a Strategy Call
          </a>
          <a href="#services"
            className="px-8 py-4 rounded border border-navy-border hover:border-slate-500 text-slate-200 hover:text-white font-semibold text-base text-center transition-colors">
            See what we build
          </a>
        </div>
      </div>
    </section>
  );
}

export function ValuePointList({ items }) {
  return (
    <div className="grid gap-3 lg:mt-4">
      {items.map((item) => (
        <div key={item} className="flex items-center gap-3 px-5 py-4 rounded-xl bg-slate-50 border border-slate-200">
          <Check size={16} strokeWidth={2.5} className="text-blue-700 flex-shrink-0" />
          <span className="text-sm font-medium text-slate-700">{item}</span>
        </div>
      ))}
    </div>
  );
}

export function ServicesSection({ heading, services, descriptionClassName = 'text-slate-700' }) {
  return (
    <section id="services" className="py-24 bg-slate-50 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-2xl mb-14">
          <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-4">What We Build</p>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">{heading}</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {services.map(({ Icon, title, desc, tags }) => (
            <div key={title} className="bg-white border border-slate-200 rounded-xl p-7 shadow-sm">
              <div className="w-11 h-11 rounded-lg bg-blue-600/10 flex items-center justify-center mb-4">
                <Icon size={20} strokeWidth={1.75} className="text-blue-700" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
              <p className={`text-sm ${descriptionClassName} leading-relaxed mb-5`}>{desc}</p>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span key={tag} className="text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1">{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ImprovementsSection({ items }) {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-2xl mb-12">
          <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-4">The Payoff</p>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">What it adds up to</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((item) => (
            <div key={item} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-50 border border-slate-200">
              <Check size={15} strokeWidth={2.5} className="text-blue-700 flex-shrink-0" />
              <span className="text-sm font-medium text-slate-700">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta({ title, description, calendarUrl }) {
  return (
    <section className="py-28 bg-navy-deep">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight mb-6">{title}</h2>
        <p className="text-lg text-slate-300 mb-12 leading-relaxed mx-auto max-w-xl">{description}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/contact"
            className="px-10 py-5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base text-center transition-colors">
            Start a Conversation
          </Link>
          <a href={calendarUrl} target="_blank" rel="noopener noreferrer"
            className="px-10 py-5 rounded border border-navy-border hover:border-slate-500 text-slate-200 hover:text-white font-semibold text-base text-center transition-colors">
            Schedule a Strategy Call
          </a>
        </div>
      </div>
    </section>
  );
}
