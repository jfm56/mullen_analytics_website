'use client';

const CORE_SERVICES = [
  {
    label: 'Operational Analytics',
    title: 'Healthcare Operational Analytics',
    desc: 'Patient flow analysis, staffing optimization, readmission trends, LOS tracking, utilization monitoring, executive dashboards, and operational performance reporting.',
    points: ['Patient Flow Analysis', 'Staffing Optimization', 'LOS & Readmission Tracking', 'Utilization Monitoring', 'Executive Dashboards', 'Performance Reporting'],
  },
  {
    label: 'Predictive Modeling',
    title: 'Predictive Healthcare Modeling',
    desc: 'Demand forecasting, census prediction, staffing shortages, surge forecasting, patient risk identification, and proactive planning models.',
    points: ['Demand Forecasting', 'Census Prediction', 'Surge Forecasting', 'Patient Risk Identification', 'Staffing Gap Prediction', 'Proactive Planning Models'],
  },
  {
    label: 'AI & Automation',
    title: 'AI Automation',
    desc: 'Documentation automation, reporting workflows, compliance support, AI-assisted summaries, QA/QI workflows, and decision support systems.',
    points: ['Documentation Automation', 'Reporting Workflows', 'Compliance Support', 'AI-Assisted Summaries', 'QA/QI Workflows', 'Decision Support Systems'],
  },
];

const BENEFITS = [
  'Improved patient outcomes',
  'Better staffing decisions',
  'Reduced operational waste',
  'Shorter patient wait times',
  'Stronger compliance reporting',
  'Better financial visibility',
  'Improved leadership reporting',
  'Less manual administrative work',
  'Better executive decisions',
  'Higher system-wide efficiency',
];

const USE_CASES = [
  { title: 'Hospital Operations Dashboards', desc: 'Real-time operational visibility for hospital leadership teams across departments, units, and service lines.' },
  { title: 'Staffing Optimization', desc: 'Predictive models that reduce staffing gaps, overtime costs, and reactive scheduling across shifts.' },
  { title: 'Patient Flow Analysis', desc: 'Track admission patterns, discharge delays, bottlenecks, and throughput metrics that impact care and cost.' },
  { title: 'Bed Utilization Forecasting', desc: 'Forecast demand by unit, service line, and season to support capacity planning and resource allocation.' },
  { title: 'Clinical Documentation Automation', desc: 'AI tools that reduce charting burden, improve note consistency, and free clinicians for patient care.' },
  { title: 'QA/QI Reporting Systems', desc: 'Automate quality improvement workflows, surface actionable performance gaps, and report with confidence.' },
  { title: 'Readmission Analysis', desc: 'Identify risk factors and intervention opportunities to reduce preventable readmissions and improve outcomes.' },
  { title: 'Leadership Operational Reporting', desc: 'Executive dashboards that consolidate organizational performance into defensible, decision-ready reporting.' },
];

export default function HealthcarePage() {
  return (
    <div>

      {/* HERO */}
      <section>
        <img
          src="/healthcare%20hero.png"
          alt="Healthcare Analytics and AI Consulting"
          className="w-full block"
          style={{ height: 'auto' }}
        />
        <div style={{ background: 'linear-gradient(180deg, #071829 0%, #0D2035 100%)' }}>
          <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
            <div className="max-w-3xl">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6" style={{ color: '#FFFFFF', lineHeight: 1.08, letterSpacing: '-0.025em' }}>
                Healthcare Analytics &amp; AI
              </h1>
              <p className="text-lg mb-4 leading-relaxed" style={{ color: '#94A3B8', maxWidth: '640px' }}>
                Helping hospitals, healthcare systems, and clinical operations teams improve patient outcomes, optimize staffing, reduce inefficiencies, and make better decisions through analytics, machine learning, and AI.
              </p>
              <p className="text-base mb-10 leading-relaxed" style={{ color: '#64748B', maxWidth: '600px' }}>
                We build forecasting systems, operational dashboards, predictive models, and AI-powered workflows for healthcare environments where accuracy, compliance, and patient outcomes matter most.
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
                  href="/portfolio"
                  className="px-8 py-4 rounded font-semibold text-base text-center transition-all duration-200"
                  style={{ backgroundColor: 'transparent', color: '#E2E8F0', border: '1px solid #1E3A58' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#4A6FA5'; e.currentTarget.style.color = '#FFFFFF'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1E3A58'; e.currentTarget.style.color = '#E2E8F0'; }}
                >
                  Explore Case Studies
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
                Why Analytics Matters in Healthcare
              </h2>
              <div className="space-y-4">
                <p className="text-base leading-relaxed" style={{ color: '#1E293B' }}>
                  Healthcare leaders operate in environments where staffing, patient flow, compliance, and clinical outcomes directly impact lives and financial performance.
                </p>
                <p className="text-base leading-relaxed" style={{ color: '#1E293B' }}>
                  Analytics, Machine Learning, and Artificial Intelligence help transform operational data into faster decisions, stronger systems, and measurable improvements across the organization.
                </p>
                <p className="text-base leading-relaxed" style={{ color: '#1E293B' }}>
                  This is not about replacing clinicians. It is about giving leadership better tools to improve care delivery, reduce inefficiencies, and strengthen long-term operational performance.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { num: '↑', label: 'Patient Outcomes', sub: 'Through data-driven clinical ops' },
                { num: '↓', label: 'Operational Waste', sub: 'Identify and eliminate inefficiencies' },
                { num: '↑', label: 'Leadership Clarity', sub: 'Defensible, real-time reporting' },
                { num: '↓', label: 'Documentation Burden', sub: 'AI-assisted workflows' },
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
            <h2 className="text-center text-3xl md:text-4xl font-bold" style={{ color: '#FFFFFF' }}>What We Build for Healthcare</h2>
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
            <h2 className="text-center text-3xl md:text-4xl font-bold" style={{ color: '#071829' }}>What This Improves</h2>
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
              <div style={{ borderLeft: '3px solid #0EA5E9', paddingLeft: '1.25rem' }}>
                <h2 className="text-3xl md:text-4xl font-bold mb-8" style={{ color: '#071829' }}>
                  Why Mullen Analytics
                </h2>
              </div>
              <div className="space-y-5">
                <p className="text-base leading-relaxed" style={{ color: '#1E293B' }}>
                  We combine real-world healthcare operations understanding with advanced analytics, predictive modeling, and explainable AI systems.
                </p>
                <p className="text-base leading-relaxed" style={{ color: '#1E293B' }}>
                  We understand the pressure of balancing patient outcomes, staffing, compliance, financial performance, and executive accountability.
                </p>
                <p className="text-base leading-relaxed" style={{ color: '#1E293B' }}>
                  Our systems are built for healthcare environments where every decision must be accurate, defensible, and operationally useful.
                </p>
                <p className="text-base leading-relaxed font-semibold" style={{ color: '#071829' }}>
                  We do not build generic dashboards. We build systems leadership trusts.
                </p>
              </div>
              <div className="mt-10 flex flex-wrap gap-3">
                {['Veteran-Owned', 'Former First Responders', 'Explainable AI', 'Procurement-Ready', 'HIPAA-Aware'].map((badge) => (
                  <span key={badge} className="px-4 py-2 rounded text-xs font-bold uppercase tracking-wider" style={{ backgroundColor: '#F0F4FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                    {badge}
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              {[
                { title: 'Operator-Level Domain Knowledge', desc: 'Founded by a veteran and former paramedic. We understand healthcare operations from the inside, not from a consulting playbook.' },
                { title: 'Explainable AI Systems', desc: 'Every model we build is designed to be understood, defended, and trusted — not just deployed.' },
                { title: 'Built for Procurement', desc: 'Our systems are designed for regulated, auditable, compliance-sensitive healthcare environments.' },
                { title: 'Leadership-Facing Outputs', desc: 'We build for the people who have to act on the data — not for data teams who store it.' },
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
          <div className="mb-14" style={{ borderLeft: '3px solid #0EA5E9', paddingLeft: '1.25rem' }}>
            <h2 className="text-3xl md:text-4xl font-bold" style={{ color: '#FFFFFF' }}>Common Healthcare Use Cases</h2>
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
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
            Better Healthcare Decisions Start with Better Data
          </h2>
          <p className="text-lg mb-12 mx-auto leading-relaxed" style={{ color: '#475569', maxWidth: '540px' }}>
            If your organization is ready to improve operations, reduce inefficiencies, and strengthen patient outcomes, we should talk.
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
