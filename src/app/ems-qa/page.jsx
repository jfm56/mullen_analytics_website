'use client';

import { trackStartTrial, trackRequestDemo } from '../../lib/conversions';

const APP_URL = 'https://app.mullenanalytics.com';
// New prospects start a trial; existing clients launch straight into the app's
// login (the bare app root redirects to a marketing page, so link login directly).
const TRIAL_URL = `${APP_URL}/trial/ems-qa`;
const LOGIN_URL = `${APP_URL}/login`;

export default function EmsQaPage() {
  const capabilities = [
    {
      num: '01',
      title: 'Automated Chart Review — On Your Hardware',
      desc: 'Every ePCR narrative is reviewed by a local model running on your infrastructure. No chart data ever leaves the building, and no public cloud service ever touches PHI. Deterministic rules catch the structured gaps; the local model reads the narrative for the rest.',
      tags: ['Local model (Ollama)', 'No PHI to the cloud', 'Narrative + structured', 'Explainable findings'],
    },
    {
      num: '02',
      title: 'Your Policies, Enforced',
      desc: 'Upload your standing orders and protocols as PDF, Markdown, or text. The system learns them (semantic embeddings) and flags charts against them — and every flag cites the exact policy it came from, so QA is defensible, not a black box.',
      tags: ['Standing orders', 'Policy-grounded flags', 'Cited sources', 'Custom rule builder'],
    },
    {
      num: '03',
      title: 'Analytics That Compound',
      desc: 'Per-provider and per-unit trends, training recommendations, and monthly QA reports as PDF or CSV. The reviewer feedback loop quietly tunes the rules over time — noisy rules sink, confirmed patterns surface.',
      tags: ['Per-provider / per-unit', 'Training recommendations', 'Monthly PDF + CSV', 'Self-tuning rules'],
    },
  ];

  const benefits = [
    'Less manual chart review',
    'Earlier documentation fixes',
    'Defensible, cited QA',
    'Stronger protocol compliance',
    'Crew-level coaching insight',
    'Audit-ready records',
    'PHI never leaves your control',
    'Faster QA turnaround',
    'Consistent reviewer standards',
    'Board-ready reporting',
  ];

  const features = [
    { title: 'Imports Everything', desc: 'CSV, NEMSIS XML (emsCharts, ESO, ImageTrend), and PDF charts — vendor quirks handled automatically.' },
    { title: 'Deterministic + Model Flags', desc: 'A transparent rule engine plus a conservative model reviewer that uses cautious, non-punitive language.' },
    { title: 'Policy RAG', desc: 'Upload protocols once; charts are flagged against them with the source standing order cited on every finding.' },
    { title: 'No-Code Rule Builder', desc: 'Build your own QA rules as nested AND/OR conditions and preview them against recent charts before enabling.' },
    { title: 'Learning Loop', desc: 'Reviewer decisions re-weight rules per agency and build an exemplar bank that sharpens the model over time.' },
    { title: 'Crew Feedback Loop', desc: 'Findings route back to the chart and the crew, with a correction workflow and supervisor sign-off.' },
    { title: 'Analytics + Reports', desc: 'Per-provider / per-unit dashboards, training recommendations, and one-click monthly PDF / CSV exports.' },
    { title: 'Hosted or Fully On-Prem', desc: 'A de-identified hosted trial, or a single-command air-gapped install on your own server for real PHI.' },
  ];

  return (
    <div style={{ fontFamily: 'inherit' }}>

      {/* HERO */}
      <section className="py-28" style={{ background: 'linear-gradient(135deg, #071829 0%, #0D2240 50%, #071829 100%)' }}>
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: '#0EA5E9' }}>
            Mullen Analytics · EMS QA / QI Platform
          </p>
          <h1 className="text-4xl md:text-6xl font-bold mb-6" style={{ color: '#FFFFFF', lineHeight: 1.15 }}>
            Automated Chart QA,<br />Built for EMS
          </h1>
          <p className="text-xl mb-12 mx-auto leading-relaxed" style={{ color: '#94A3B8', maxWidth: '640px' }}>
            Review every chart against your protocols, catch documentation gaps before billing and audits, and coach your crews — with a secure local model that runs on your hardware and never sends PHI to the cloud.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={TRIAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackStartTrial()}
              className="px-10 py-5 rounded-md font-semibold text-lg shadow-xl transition-all duration-200 text-center"
              style={{ backgroundColor: '#1D4ED8', color: '#FFFFFF' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2563EB')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1D4ED8')}
            >
              Start 30-Day Free Trial
            </a>
            <a
              href="/contact"
              onClick={() => trackRequestDemo()}
              className="px-10 py-5 rounded-md border-2 font-semibold text-lg transition-all duration-200 text-center"
              style={{ borderColor: '#FFFFFF', color: '#FFFFFF', backgroundColor: 'transparent' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; e.currentTarget.style.color = '#071829'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#FFFFFF'; }}
            >
              Request a Demo
            </a>
          </div>
          <p className="text-sm mt-5" style={{ color: '#64748B' }}>
            De-identified hosted trial — no PHI.&nbsp;&nbsp;·&nbsp;&nbsp;Existing client?{' '}
            <a href={LOGIN_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#0EA5E9', fontWeight: 600 }}>
              Launch the platform →
            </a>
          </p>
        </div>
      </section>

      {/* WHY IT MATTERS */}
      <section className="py-24" style={{ backgroundColor: '#071829' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold" style={{ color: '#FFFFFF' }}>Why EMS QA Is Hard</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-5">
              <p className="text-lg leading-relaxed" style={{ color: '#94A3B8' }}>
                Quality review is where good documentation, billing integrity, and protocol compliance all meet — and it is almost always done by hand, one chart at a time, by the people you can least afford to pull off the road.
              </p>
              <p className="text-lg leading-relaxed" style={{ color: '#94A3B8' }}>
                Most agencies can only review a fraction of their charts. Issues surface late, coaching is inconsistent, and the rationale behind a flag lives in a reviewer&apos;s head instead of a citable record.
              </p>
              <p className="text-lg leading-relaxed" style={{ color: '#94A3B8' }}>
                And in EMS, the data is PHI. Many agencies would rather it never leave infrastructure they control than hand it to a third-party AI service — so most teams get none of the leverage automation could provide.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              {['Review every chart, not a sample', 'Findings tied to your protocols', 'PHI stays on your hardware', 'Coaching backed by evidence'].map((item) => (
                <div key={item} className="flex items-start gap-3 p-4 rounded-lg" style={{ backgroundColor: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)' }}>
                  <span className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9', marginTop: '6px' }} />
                  <span className="text-sm font-medium" style={{ color: '#E2E8F0' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* THREE CORE CAPABILITIES */}
      <section className="py-24" style={{ backgroundColor: '#F8FAFD' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-center" style={{ color: '#071829' }}>What the Platform Does</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {capabilities.map((card) => (
              <div
                key={card.num}
                className="bg-white rounded-xl p-8 shadow-md hover:shadow-xl transition-all duration-300 border-t-4 group"
                style={{ borderTopColor: '#0EA5E9' }}
              >
                <p className="text-4xl font-bold mb-4" style={{ color: '#E5E7EB' }}>{card.num}</p>
                <h3 className="text-xl font-bold mb-4" style={{ color: '#071829' }}>{card.title}</h3>
                <p className="text-base leading-relaxed mb-6" style={{ color: '#475569' }}>{card.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {card.tags.map((tag) => (
                    <span key={tag} className="text-xs font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: '#EBF8FF', color: '#1D4ED8' }}>{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="py-24" style={{ backgroundColor: '#071829' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-center" style={{ color: '#FFFFFF' }}>What This Improves</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {benefits.map((benefit) => (
              <div
                key={benefit}
                className="flex items-center gap-3 px-5 py-4 rounded-lg"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(14,165,233,0.2)' }}
              >
                <svg className="flex-shrink-0 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#0EA5E9" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-medium" style={{ color: '#E2E8F0' }}>{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECURITY / WHY DIFFERENT */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-8" style={{ color: '#071829', borderLeft: '4px solid #0EA5E9', paddingLeft: '1.5rem' }}>Secure by Design</h2>
              <div className="space-y-5">
                <p className="text-lg leading-relaxed" style={{ color: '#1E293B' }}>
                  The platform is built around a hard rule: no chart data ever reaches a public cloud service. The language model and the embeddings run locally, so PHI stays inside your network.
                </p>
                <p className="text-lg leading-relaxed" style={{ color: '#1E293B' }}>
                  Narratives are run through PHI redaction before the model sees them, every model call is logged for forensic audit, and tenant data is isolated at the database level.
                </p>
                <p className="text-lg leading-relaxed font-medium" style={{ color: '#071829' }}>
                  Run it as a de-identified hosted trial, or install it fully air-gapped on your own server — same platform, your choice of footprint.
                </p>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                {['Local model — no public cloud', 'PHI redaction', 'Row-level tenant isolation', 'Hash-chained audit log', 'MFA', 'On-prem / air-gap option'].map((badge) => (
                  <span key={badge} className="px-4 py-2 rounded-full text-sm font-semibold" style={{ backgroundColor: '#071829', color: '#FFFFFF' }}>{badge}</span>
                ))}
              </div>
            </div>
            <div className="rounded-xl p-10" style={{ backgroundColor: '#071829' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-6" style={{ color: '#0EA5E9' }}>How a chart flows</p>
              <div className="space-y-4">
                {[
                  'Import — CSV, NEMSIS XML, or PDF',
                  'Redact — PHI removed before any model sees it',
                  'Review — rules + local model, grounded in your policies',
                  'Flag — findings cite the protocol they came from',
                  'Coach — routed to the crew, tracked to correction',
                  'Learn — feedback re-weights rules over time',
                ].map((step, i) => (
                  <div key={step} className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'rgba(14,165,233,0.15)', color: '#0EA5E9' }}>{i + 1}</span>
                    <span className="text-sm font-medium pt-1" style={{ color: '#E2E8F0' }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="py-24" style={{ backgroundColor: '#F8FAFD' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-center" style={{ color: '#071829' }}>Built for Real EMS Operations</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 border-b-2"
                style={{ borderBottomColor: '#0EA5E9' }}
              >
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#0EA5E9' }}>{String(i + 1).padStart(2, '0')}</p>
                <h3 className="font-bold mb-3 text-base" style={{ color: '#071829' }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-28" style={{ background: 'linear-gradient(135deg, #071829 0%, #0D2240 50%, #071829 100%)' }}>
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-center" style={{ color: '#FFFFFF', lineHeight: 1.2 }}>
            See Your Charts<br />Reviewed in Minutes
          </h2>
          <p className="text-xl mb-12 mx-auto leading-relaxed text-center" style={{ color: '#94A3B8', maxWidth: '560px' }}>
            Start a de-identified trial, or talk to us about an on-prem install for your agency.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={TRIAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackStartTrial()}
              className="px-10 py-5 rounded-md font-semibold text-lg shadow-xl transition-all duration-200 text-center"
              style={{ backgroundColor: '#1D4ED8', color: '#FFFFFF' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2563EB')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1D4ED8')}
            >
              Start 30-Day Free Trial
            </a>
            <a
              href="/contact"
              onClick={() => trackRequestDemo()}
              className="px-10 py-5 rounded-md border-2 font-semibold text-lg transition-all duration-200 text-center"
              style={{ borderColor: '#FFFFFF', color: '#FFFFFF', backgroundColor: 'transparent' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; e.currentTarget.style.color = '#071829'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#FFFFFF'; }}
            >
              Request a Demo
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
