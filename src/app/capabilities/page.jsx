'use client';

const TRUST_INDICATORS = [
  'Veteran-Owned & Operated',
  'Real-World Operational Experience',
  'Explainable AI You Can Trust',
  'Security & Compliance Focused',
];

const CAPABILITY_BLOCKS = [
  {
    title: 'Decision Intelligence & Analytics Strategy',
    desc: 'We help leadership teams translate complex data into clear, actionable direction aligned with organizational goals and operational reality.',
    points: ['Analytics Strategy', 'KPI Design', 'Performance Insights', 'Executive Dashboards', 'Operational Reporting', 'Model Governance'],
    img: '/From%20Dashboards%20to%20Decisions.png',
    alt: 'Decision Intelligence & Analytics Strategy',
    imgLeft: true,
    bg: '#FFFFFF',
  },
  {
    title: 'Public Safety & Emergency Services Analytics',
    desc: 'Data-driven operational solutions for EMS, fire, and public safety agencies to improve response, reduce risk, and optimize resources.',
    points: ['Demand Forecasting', 'Staffing Optimization', 'Response Analytics', 'Risk Modeling', 'Deployment Planning', 'Incident Intelligence'],
    img: '/Public%20Safety%20%26%20Emergency%20Services%20Analytics.jpeg',
    alt: 'Public Safety Analytics',
    imgLeft: false,
    bg: '#F8FAFD',
  },
  {
    title: 'Healthcare & Biomedical Intelligence',
    desc: 'Analytics designed for accuracy, accountability, and care quality in healthcare environments where lives and resources are on the line.',
    points: ['Patient Flow Analysis', 'LOS Optimization', 'Clinical Insights', 'Readmission AI', 'Healthcare Dashboards', 'Biomedical Reporting'],
    img: '/Healthcare%20%26%20Biomedical%20Intelligence.jpg',
    alt: 'Healthcare & Biomedical Intelligence',
    imgLeft: true,
    bg: '#FFFFFF',
  },
  {
    title: 'Biology, Life Sciences & Research Analytics',
    desc: 'We support research organizations in turning data into discoveries through advanced analytics, AI, and machine learning for biomedical and life sciences.',
    points: ['Biomarker Analytics', 'Cohort Analysis', 'Predictive Modeling', 'Research Dashboards', 'Trial Performance', 'Data Quality Monitoring'],
    img: '/Biology, Life Sciences & Research Analytics.jpg',
    alt: 'Biology, Life Sciences & Research Analytics',
    imgLeft: false,
    bg: '#F8FAFD',
  },
  {
    title: 'Analytics Platforms, AI & Technology Delivery',
    desc: 'We design and deliver secure, scalable, and modern analytics platforms and AI systems built to power mission-critical operations.',
    points: ['Modern Data Platforms', 'AI & Machine Learning', 'Data Engineering', 'Secure Integrations', 'Dashboard Systems', 'Workflow Automation'],
    img: '/Analytics Platforms, AI & Technology Delivery.jpg',
    alt: 'Analytics Platforms, AI & Technology Delivery',
    imgLeft: true,
    bg: '#FFFFFF',
  },
];

const PROCUREMENT_CARDS = [
  { title: 'Security & Compliance', desc: 'Information security and data protection standards built into every engagement.' },
  { title: 'Explainable AI', desc: 'Auditable analytics models with clear documentation and defensible logic.' },
  { title: 'Ownership Ready', desc: 'Deliverables structured for client ownership, transfer, and long-term use.' },
  { title: 'Secure Data Handling', desc: 'Structured protocols for sensitive, regulated, and protected data.' },
  { title: 'Scalable Solutions', desc: 'Systems architected for growth, change, and multi-year operations.' },
  { title: 'Flexible Engagement', desc: 'Pilots, phased rollouts, retainers, or multi-year program support.' },
];

const ENGAGEMENT_ITEMS = [
  'Project-based engagements',
  'Retainer-based advisory support',
  'Long-term partnerships',
  'Change management & stakeholder enablement',
  'Staff augmentation',
  'Embedded analytics leadership',
];

const WHY_CARDS = [
  { title: 'Domain Expertise', desc: 'Deep operational experience in EMS, public safety, healthcare, and research.' },
  { title: 'Operational Focus', desc: 'Solutions designed for real operational impact, not just reports and dashboards.' },
  { title: 'Explainable AI', desc: 'Transparent models leaders can understand, trust, and defend.' },
  { title: 'Results That Matter', desc: 'We deliver measurable improvements in performance, efficiency, and outcomes.' },
];

export default function CapabilitiesPage() {
  return (
    <div>

      {/* HERO IMAGE */}
      <section className="w-full overflow-hidden">
        <img
          src="/capabilities%20hero.png"
          alt="Capabilities Hero"
          className="w-full"
          style={{ display: 'block' }}
        />
      </section>

      {/* HERO BANNER */}
      <section style={{ backgroundColor: '#071829' }}>
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
          <div className="max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-widest mb-6" style={{ color: '#0EA5E9' }}>
              Mullen Analytics & AI Consulting
            </p>
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8"
              style={{ color: '#FFFFFF', lineHeight: 1.07, letterSpacing: '-0.025em' }}
            >
              Turning Complex Data Into<br />Defensible Decisions
            </h1>
            <p className="text-lg md:text-xl mb-4 leading-relaxed" style={{ color: '#94A3B8', maxWidth: '700px' }}>
              Mullen Analytics is a veteran-owned analytics and AI consulting firm specializing in EMS, fire, public safety, and healthcare organizations.
            </p>
            <p className="text-base mb-10 leading-relaxed" style={{ color: '#64748B', maxWidth: '640px' }}>
              We build forecasting models, dashboards, and AI systems for high-stakes environments where decisions must be fast, explainable, and defensible.
            </p>
            <div className="flex flex-wrap gap-3 mb-10">
              {TRUST_INDICATORS.map((t) => (
                <span
                  key={t}
                  className="flex items-center gap-2 px-4 py-2 rounded text-xs font-semibold"
                  style={{ backgroundColor: 'rgba(14,165,233,0.1)', color: '#7DD3FC', border: '1px solid rgba(14,165,233,0.2)' }}
                >
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {t}
                </span>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="https://calendar.app.google/4JuyKX7s75GmJT5u9"
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
                href="#capabilities"
                className="px-8 py-4 rounded font-semibold text-base text-center transition-all duration-200"
                style={{ backgroundColor: 'transparent', color: '#E2E8F0', border: '1px solid #1E3A58' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#4A6FA5'; e.currentTarget.style.color = '#FFFFFF'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1E3A58'; e.currentTarget.style.color = '#E2E8F0'; }}
              >
                See How We Help Organizations
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CAPABILITIES INTRO */}
      <section id="capabilities" className="py-20" style={{ backgroundColor: '#F8FAFD' }}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: '#071829' }}>Capabilities</h2>
          <div className="w-16 h-px mx-auto mb-6" style={{ backgroundColor: '#0EA5E9' }} />
          <p className="text-lg leading-relaxed mx-auto" style={{ color: '#1E293B', maxWidth: '680px' }}>
            Our capabilities span strategy, analytics, AI, technology delivery, and purpose-built solutions for organizations operating in complex, high-stakes, and mission-critical environments.
          </p>
        </div>
      </section>

      {/* CORE CAPABILITY BLOCKS */}
      {CAPABILITY_BLOCKS.map((block) => (
        <section key={block.title} className="py-20" style={{ backgroundColor: block.bg }}>
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-14 items-center">
              <div
                className={`rounded-xl overflow-hidden shadow-xl${block.imgLeft ? '' : ' md:order-2'}`}
                style={{ border: '1px solid rgba(7,24,41,0.08)' }}
              >
                <img src={block.img} alt={block.alt} className="w-full h-full object-cover" style={{ display: 'block' }} />
              </div>
              <div className={block.imgLeft ? '' : 'md:order-1'}>
                <div className="w-10 h-0.5 mb-5" style={{ backgroundColor: '#0EA5E9' }} />
                <h2 className="text-2xl md:text-3xl font-bold mb-5" style={{ color: '#071829', letterSpacing: '-0.015em' }}>
                  {block.title}
                </h2>
                <p className="text-base leading-relaxed mb-8" style={{ color: '#475569' }}>
                  {block.desc}
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {block.points.map((pt) => (
                    <div
                      key={pt}
                      className="flex items-center gap-2.5 px-4 py-3 rounded-lg"
                      style={{ backgroundColor: block.bg === '#FFFFFF' ? '#F8FAFD' : '#FFFFFF', border: '1px solid #E1E8F5' }}
                    >
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="#0EA5E9" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-xs font-semibold" style={{ color: '#1E293B' }}>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* PROCUREMENT & CONTRACTING */}
      <section className="py-24" style={{ background: 'linear-gradient(180deg, #071829 0%, #0A1F35 100%)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-5" style={{ color: '#FFFFFF' }}>
              Procurement & Contracting Alignment
            </h2>
            <p className="text-lg mx-auto" style={{ color: '#64748B', maxWidth: '540px' }}>
              Experienced in supporting public sector procurement, RFP-based engagements, and multi-year contracts.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {PROCUREMENT_CARDS.map((card) => (
              <div
                key={card.title}
                className="rounded-xl p-7 transition-all duration-200"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderTop: '3px solid #1D4ED8' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)')}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(14,165,233,0.12)' }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#0EA5E9" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold mb-2" style={{ color: '#F1F5F9' }}>{card.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ENGAGEMENT MODELS */}
      <section className="py-24" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#0EA5E9' }}>How We Work</p>
              <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: '#071829', letterSpacing: '-0.015em' }}>
                Engagement Models
              </h2>
              <p className="text-base leading-relaxed mb-4" style={{ color: '#475569' }}>
                Our work is collaborative and built around your needs. We offer flexible engagement models to fit your team, timeline, and goals.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>
                Engagements are scoped based on complexity, data maturity, and operational impact — with pricing aligned to delivered value.
              </p>
            </div>
            <div className="grid gap-3">
              {ENGAGEMENT_ITEMS.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-4 px-5 py-4 rounded-xl"
                  style={{ backgroundColor: '#F8FAFD', border: '1px solid #E1E8F5' }}
                >
                  <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(14,165,233,0.12)' }}>
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="#0EA5E9" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium" style={{ color: '#1E293B' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* WHY MULLEN ANALYTICS */}
      <section className="py-24" style={{ backgroundColor: '#F8FAFD' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold" style={{ color: '#071829' }}>Why Mullen Analytics</h2>
            <div className="w-16 h-px mx-auto mt-5" style={{ backgroundColor: '#0EA5E9' }} />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {WHY_CARDS.map((card) => (
              <div
                key={card.title}
                className="p-8 rounded-xl"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #E1E8F5', borderTop: '3px solid #0EA5E9', boxShadow: '0 4px 20px rgba(7,24,41,0.06)' }}
              >
                <h3 className="text-base font-bold mb-3" style={{ color: '#071829' }}>{card.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-28" style={{ background: 'linear-gradient(135deg, #071829 0%, #0D2240 50%, #071829 100%)' }}>
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2
            className="text-4xl md:text-5xl font-bold mb-6 mx-auto"
            style={{ color: '#FFFFFF', lineHeight: 1.1, maxWidth: '640px', letterSpacing: '-0.02em' }}
          >
            Ready to Move Forward?
          </h2>
          <p className="text-lg mb-12 mx-auto leading-relaxed" style={{ color: '#475569', maxWidth: '520px' }}>
            If you're ready to improve operations, optimize resources, and make stronger decisions with analytics and AI, we're ready to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://calendar.app.google/4JuyKX7s75GmJT5u9"
              target="_blank"
              rel="noopener noreferrer"
              className="px-10 py-5 rounded font-semibold text-base text-center transition-all duration-200"
              style={{ backgroundColor: '#1D4ED8', color: '#FFFFFF' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2563EB')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1D4ED8')}
            >
              Schedule a Call
            </a>
            <a
              href="/portfolio"
              className="px-10 py-5 rounded font-semibold text-base text-center transition-all duration-200"
              style={{ backgroundColor: 'transparent', color: '#E2E8F0', border: '1px solid #1E3A58' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#4A6FA5'; e.currentTarget.style.color = '#FFFFFF'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1E3A58'; e.currentTarget.style.color = '#E2E8F0'; }}
            >
              Explore Our Work
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
