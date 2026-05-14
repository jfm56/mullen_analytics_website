'use client';

const CORE_SERVICES = [
  {
    label: 'Research Analytics',
    title: 'Research Analytics',
    desc: 'Clinical trial dashboards, operational visibility, biomarker tracking, protocol monitoring, and research performance reporting.',
    points: ['Clinical Trial Dashboards', 'Biomarker Tracking', 'Protocol Monitoring', 'Operational Visibility', 'Research Performance Reporting', 'Longitudinal Data Analysis'],
  },
  {
    label: 'Predictive Modeling',
    title: 'Predictive Modeling',
    desc: 'Enrollment forecasting, trial risk identification, dropout prediction, anomaly detection, and real-world evidence analysis.',
    points: ['Enrollment Forecasting', 'Trial Risk Identification', 'Dropout Prediction', 'Anomaly Detection', 'Real-World Evidence Analysis', 'Adverse Event Modeling'],
  },
  {
    label: 'AI & Automation',
    title: 'AI Automation',
    desc: 'Document processing, protocol support, reporting automation, research workflow optimization, and intelligent data structuring.',
    points: ['Document Processing', 'Protocol Support', 'Reporting Automation', 'Workflow Optimization', 'Intelligent Data Structuring', 'AI-Assisted Review'],
  },
];

const BENEFITS = [
  'Faster research decisions',
  'Better trial performance',
  'Improved enrollment visibility',
  'Stronger data quality',
  'Reduced reporting burden',
  'Better compliance readiness',
  'Improved operational efficiency',
  'Faster discovery cycles',
  'Better executive visibility',
  'Stronger research outcomes',
];

const USE_CASES = [
  { title: 'Clinical Trial Analytics', desc: 'End-to-end visibility into trial performance, protocol adherence, site activity, and outcomes data.' },
  { title: 'Enrollment Forecasting', desc: 'Predict enrollment velocity, identify bottlenecks, and optimize recruitment strategy with data-driven models.' },
  { title: 'Biomarker Monitoring', desc: 'Track biomarker patterns across cohorts and timepoints with automated flagging and visualization.' },
  { title: 'Real-World Evidence Analysis', desc: 'Analyze large-scale observational datasets to support regulatory submissions, publications, and decisions.' },
  { title: 'Research Reporting Automation', desc: 'Reduce manual reporting burden with automated pipelines that produce consistent, audit-ready outputs.' },
  { title: 'Protocol Compliance Tracking', desc: 'Monitor adherence to study protocols, flag deviations early, and support GCP compliance workflows.' },
  { title: 'Operational Research Dashboards', desc: 'Give research leadership and operations teams real-time visibility across studies, sites, and budgets.' },
  { title: 'AI-Assisted Document Processing', desc: 'Accelerate document review, data extraction, and annotation tasks using AI-powered workflows.' },
];

export default function BiomedicalResearchPage() {
  return (
    <div>

      {/* HERO IMAGE */}
      <section className="w-full overflow-hidden">
        <img
          src="/biomedical%20research.jpeg"
          alt="Biomedical Research Analytics and AI"
          className="w-full"
          style={{ display: 'block' }}
        />
      </section>

      {/* HERO TEXT */}
      <section>
        <div style={{ background: 'linear-gradient(180deg, #071829 0%, #0D2035 100%)' }}>
          <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
            <div className="max-w-3xl">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6" style={{ color: '#FFFFFF', lineHeight: 1.08, letterSpacing: '-0.025em' }}>
                Biomedical Research Analytics &amp; AI
              </h1>
              <p className="text-lg mb-4 leading-relaxed" style={{ color: '#94A3B8', maxWidth: '640px' }}>
                Helping research institutions, clinical trial teams, and biomedical organizations accelerate discovery through advanced analytics, machine learning, and AI-driven decision systems.
              </p>
              <p className="text-base mb-10 leading-relaxed" style={{ color: '#64748B', maxWidth: '600px' }}>
                We build data pipelines, predictive models, research dashboards, and AI-powered systems that improve trial performance, operational visibility, and research outcomes.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="https://calendar.app.google/1BFgdi2pgjF9vwAB8"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-4 rounded font-semibold text-base text-center transition-all duration-200"
                  style={{ backgroundColor: '#1D4ED8', color: '#FFFFFF' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2563EB')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1D4ED8')}
                >
                  Schedule a Strategy Call
                </a>
                <a
                  href="/capabilities"
                  className="px-8 py-4 rounded font-semibold text-base text-center transition-all duration-200"
                  style={{ backgroundColor: 'transparent', color: '#E2E8F0', border: '1px solid #1E3A58' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#4A6FA5'; e.currentTarget.style.color = '#FFFFFF'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1E3A58'; e.currentTarget.style.color = '#E2E8F0'; }}
                >
                  Explore Research Solutions
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY IT MATTERS */}
      <section className="py-24" style={{ backgroundColor: '#F8FAFD' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: '#071829' }}>
                Why Analytics Matters in Biomedical Research
              </h2>
              <div className="space-y-4">
                <p className="text-base leading-relaxed" style={{ color: '#1E293B' }}>
                  Research organizations manage massive amounts of complex data across trials, studies, operations, and regulatory environments.
                </p>
                <p className="text-base leading-relaxed" style={{ color: '#1E293B' }}>
                  Analytics and AI help improve speed, accuracy, visibility, and decision-making across the full research lifecycle — from early discovery through regulatory submission.
                </p>
                <p className="text-base leading-relaxed" style={{ color: '#1E293B' }}>
                  This means stronger trial performance, better data quality, faster insights, and more defensible scientific outcomes.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { num: '↑', label: 'Discovery Speed', sub: 'Faster insights from complex data' },
                { num: '↓', label: 'Reporting Burden', sub: 'Automated, audit-ready outputs' },
                { num: '↑', label: 'Trial Visibility', sub: 'Real-time enrollment and performance' },
                { num: '↓', label: 'Data Quality Risk', sub: 'Automated validation and flagging' },
              ].map((stat) => (
                <div key={stat.label} className="p-6 rounded-xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E1E8F5', boxShadow: '0 2px 12px rgba(7,24,41,0.06)' }}>
                  <p className="text-2xl font-black mb-1" style={{ color: '#1D4ED8' }}>{stat.num}</p>
                  <p className="text-sm font-bold mb-1" style={{ color: '#071829' }}>{stat.label}</p>
                  <p className="text-xs leading-snug" style={{ color: '#64748B' }}>{stat.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* THREE CORE SERVICES */}
      <section className="py-24" style={{ background: 'linear-gradient(180deg, #071829 0%, #0A1F35 100%)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold" style={{ color: '#FFFFFF' }}>What We Build for Research</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {CORE_SERVICES.map((service) => (
              <div
                key={service.title}
                className="rounded-xl p-8"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderTop: '3px solid #1D4ED8' }}
              >
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#0EA5E9' }}>{service.label}</p>
                <h3 className="text-lg font-bold mb-4" style={{ color: '#F1F5F9' }}>{service.title}</h3>
                <p className="text-sm leading-relaxed mb-6" style={{ color: '#64748B' }}>{service.desc}</p>
                <div className="grid grid-cols-1 gap-2">
                  {service.points.map((pt) => (
                    <div key={pt} className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="#0EA5E9" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-xs font-medium" style={{ color: '#94A3B8' }}>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT THIS IMPROVES */}
      <section className="py-24" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold" style={{ color: '#071829' }}>What This Improves</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 max-w-5xl mx-auto">
            {BENEFITS.map((benefit) => (
              <div
                key={benefit}
                className="flex items-center gap-3 px-4 py-3 rounded-lg"
                style={{ backgroundColor: '#F8FAFD', border: '1px solid #E1E8F5' }}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="#1D4ED8" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs font-medium leading-snug" style={{ color: '#1E293B' }}>{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY MULLEN ANALYTICS */}
      <section className="py-24" style={{ backgroundColor: '#F8FAFD' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <div>
              <h2
                className="text-3xl md:text-4xl font-bold mb-8"
                style={{ color: '#071829', borderLeft: '3px solid #0EA5E9', paddingLeft: '1.25rem' }}
              >
                Why Mullen Analytics
              </h2>
              <div className="space-y-5">
                <p className="text-base leading-relaxed" style={{ color: '#1E293B' }}>
                  We combine advanced analytics and AI engineering with operational understanding of healthcare and biomedical systems.
                </p>
                <p className="text-base leading-relaxed" style={{ color: '#1E293B' }}>
                  Our focus is not theoretical AI. It is practical, explainable systems that improve research operations, trial execution, and scientific decision-making.
                </p>
                <p className="text-base leading-relaxed font-semibold" style={{ color: '#071829' }}>
                  We build systems organizations can trust.
                </p>
              </div>
              <div className="mt-10 flex flex-wrap gap-3">
                {['Veteran-Owned', 'Explainable AI', 'Regulatory-Aware', 'Procurement-Ready', 'Research Domain Expertise'].map((badge) => (
                  <span key={badge} className="px-4 py-2 rounded text-xs font-bold uppercase tracking-wider" style={{ backgroundColor: '#F0F4FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                    {badge}
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              {[
                { title: 'Healthcare & Biomedical Domain Knowledge', desc: 'We understand the research lifecycle — from trial design through regulatory submission — and build systems that match operational reality.' },
                { title: 'Explainable, Defensible AI', desc: 'Every model we deploy is built to be understood, audited, and defended. No black boxes in high-stakes research environments.' },
                { title: 'Regulatory-Aware Systems', desc: 'Our pipelines and dashboards are designed with GCP, FDA, and IRB compliance considerations built in from the start.' },
                { title: 'Practical, Not Theoretical', desc: 'We deliver working systems — not white papers. Our focus is on operational impact, measurable outcomes, and research acceleration.' },
              ].map((item) => (
                <div key={item.title} className="p-5 rounded-xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E1E8F5' }}>
                  <h4 className="text-sm font-bold mb-2" style={{ color: '#071829' }}>{item.title}</h4>
                  <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* COMMON USE CASES */}
      <section className="py-24" style={{ background: 'linear-gradient(180deg, #071829 0%, #0A1F35 100%)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-14">
            <h2 className="text-3xl md:text-4xl font-bold" style={{ color: '#FFFFFF' }}>Common Biomedical Research Use Cases</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {USE_CASES.map((uc) => (
              <div
                key={uc.title}
                className="p-6 rounded-xl"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(14,165,233,0.15)' }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#0EA5E9" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold mb-2" style={{ color: '#E2E8F0' }}>{uc.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: '#64748B' }}>{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-28" style={{ background: 'linear-gradient(135deg, #071829 0%, #0D2240 50%, #071829 100%)' }}>
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2
            className="text-4xl md:text-5xl font-bold mb-6 mx-auto"
            style={{ color: '#FFFFFF', lineHeight: 1.12, maxWidth: '680px', letterSpacing: '-0.02em' }}
          >
            Better Research Starts with Better Systems
          </h2>
          <p className="text-lg mb-12 mx-auto leading-relaxed" style={{ color: '#475569', maxWidth: '540px' }}>
            If your organization is ready to improve visibility, accelerate discovery, and strengthen research outcomes, we should talk.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/contact"
              className="px-10 py-5 rounded font-semibold text-base text-center transition-all duration-200"
              style={{ backgroundColor: '#1D4ED8', color: '#FFFFFF' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2563EB')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1D4ED8')}
            >
              Start a Conversation
            </a>
            <a
              href="https://calendar.app.google/1BFgdi2pgjF9vwAB8"
              target="_blank"
              rel="noopener noreferrer"
              className="px-10 py-5 rounded font-semibold text-base text-center transition-all duration-200"
              style={{ backgroundColor: 'transparent', color: '#E2E8F0', border: '1px solid #1E3A58' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#4A6FA5'; e.currentTarget.style.color = '#FFFFFF'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1E3A58'; e.currentTarget.style.color = '#E2E8F0'; }}
            >
              Schedule a Strategy Call
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
