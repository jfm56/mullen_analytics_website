import Link from 'next/link';
import { Database, FlaskConical, ArrowRight } from 'lucide-react';

// Educational article — moved off the homepage (it was bloating the sales funnel)
// so it can earn SEO on its own. FIXED palette (see app/page.jsx).

export const metadata = {
  title: 'Data Science vs. Data Engineering, in Plain English | Mullen Analytics',
  description:
    'People mix these two up all the time — they are two different jobs. A no-jargon explanation of what data engineering and data science each do, and how they work together.',
};

const CALENDAR_URL = 'https://calendar.app.google/1BFgdi2pgjF9vwAB8';

export default function DataScienceVsEngineeringPage() {
  return (
    <div className="bg-white">

      {/* HERO */}
      <section className="bg-navy-deep">
        <div className="max-w-4xl mx-auto px-6 py-20 md:py-24">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-400 mb-5">Plain-English Guide</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-[1.1] tracking-tight mb-6">
            Data Science vs. Data Engineering, in Plain English
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed max-w-2xl">
            People mix these two up all the time. They&apos;re actually two different jobs. Here&apos;s what each
            one really means — no jargon.
          </p>
        </div>
      </section>

      {/* CONTENT */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Data Engineering */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-lg bg-blue-600/10 flex items-center justify-center flex-shrink-0">
                  <Database size={20} strokeWidth={1.75} className="text-blue-700" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-sky-600">Getting your data ready</p>
                  <h2 className="text-lg font-bold text-slate-900">Data Engineering</h2>
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
                  <h2 className="text-lg font-bold text-slate-900">Data Science</h2>
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

          {/* CTA */}
          <div className="mt-14 text-center border-t border-slate-200 pt-14">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">Not sure which one you need?</h2>
            <p className="text-base text-slate-600 leading-relaxed mb-8 max-w-xl mx-auto">
              Most organizations need a bit of both. Tell us what you&apos;re trying to solve and we&apos;ll point
              you to the right starting place — your first project consultation is free.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact"
                className="px-8 py-4 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base text-center transition-colors">
                Get a Free Consultation
              </Link>
              <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer"
                className="px-8 py-4 rounded border border-slate-300 hover:border-slate-500 text-slate-700 font-semibold text-base text-center transition-colors">
                Schedule a Call
              </a>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
