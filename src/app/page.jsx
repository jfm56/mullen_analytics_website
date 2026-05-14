'use client';

const SERVICES = [
  {
    img: '/first%20responder%20analytics.jpeg',
    alt: 'First Responder Analytics',
    label: 'Public Safety',
    title: 'First Responder Analytics',
    desc: 'Demand forecasting, staffing optimization, response time analysis, unit utilization, and operational dashboards for EMS, fire, and public safety agencies.',
    href: '/first-responders',
  },
  {
    img: '/healcare%20analytics.jpeg',
    alt: 'Healthcare Analytics',
    label: 'Healthcare',
    title: 'Healthcare Analytics',
    desc: 'Explainable analytics and AI systems for clinical operations, quality improvement, patient flow, documentation automation, and healthcare decision support.',
    href: '/healthcare',
  },
  {
    img: '/biomedical%20research.jpeg',
    alt: 'Biomedical Research',
    label: 'Research',
    title: 'Biomedical Research',
    desc: 'Data pipelines, outcome modeling, AI-assisted literature synthesis, and analytics systems built for scientific rigor, reproducibility, and research accountability.',
    href: '/biomedical-research',
  },
  {
    img: '/ai%20automation.jpeg',
    alt: 'AI & Automation',
    label: 'AI & Automation',
    title: 'AI Automation',
    desc: 'Practical AI tools that eliminate manual work, structure complex documents, support compliance reporting, and improve consistency across operational workflows.',
    href: '/capabilities',
  },
];

const PILLARS = [
  { title: 'Explainable', desc: 'Every model and insight is designed to be understood — not just trusted on faith.' },
  { title: 'Defensible', desc: 'Built for accountability in regulated, auditable, and high-consequence environments.' },
  { title: 'Secure', desc: 'Systems architected for sensitive operational, clinical, and government data.' },
  { title: 'Operationally Useful', desc: 'Tools built around how your teams actually work — not how consultants imagine they do.' },
  { title: 'Leadership-Ready', desc: 'Outputs your leadership can act on, stand behind, and use in procurement reviews.' },
  { title: 'Real-World Experience', desc: 'Built on emergency services and healthcare operations — not theoretical frameworks.' },
];

const FOCUS_AREAS = [
  'EMS demand forecasting',
  'Response time analysis',
  'Staffing and deployment models',
  'Healthcare document processing',
  'Patient flow and operational dashboards',
  'Quality improvement analytics',
  'AI-assisted reporting',
  'Public safety performance dashboards',
  'Predictive modeling for operational planning',
  'Clinical trial data analysis',
  'Biomedical data pipelines',
  'Research outcome modeling',
];

const SELECTED_WORK = [
  {
    sector: 'EMS Operations',
    title: 'Demand Forecasting & Staffing Optimization',
    desc: 'Predictive models and operational dashboards supporting resource allocation decisions for high-volume emergency services.',
  },
  {
    sector: 'Healthcare Analytics',
    title: 'Explainable ML for Medical Classification',
    desc: 'Interpretable machine learning models built for transparency, clinical accountability, and executive-level defensibility.',
  },
  {
    sector: 'AI Automation',
    title: 'AI-Assisted Reporting & Document Processing',
    desc: 'Practical automation tools reducing manual workload and improving consistency across high-volume operational workflows.',
  },
];

const TRUST_BADGES = ['Veteran-Owned', 'Former First Responders', 'Explainable AI', 'Procurement-Ready'];

export default function Home() {
  return (
    <div>

      {/* HERO */}
      <section>
        <img
          src="/Hero%20image.png"
          alt="Analytics and AI for First Responders and Healthcare"
          className="w-full block"
          style={{ height: 'auto' }}
        />
        <div style={{ background: 'linear-gradient(180deg, #071829 0%, #0D2035 100%)' }}>
          <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
            <div className="max-w-3xl">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6" style={{ color: '#FFFFFF', lineHeight: 1.08, letterSpacing: '-0.025em' }}>
                Analytics &amp; AI for First Responders and Healthcare Organizations
              </h1>
              <p className="text-lg mb-10 leading-relaxed" style={{ color: '#94A3B8', maxWidth: '620px' }}>
                Specialized consulting built for EMS, fire, hospitals, and healthcare systems where decisions carry real operational consequences — and every system must be explainable, defensible, and trusted.
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
                  Explore Capabilities
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <div style={{ backgroundColor: '#0A1929', borderTop: '1px solid #0F2740', borderBottom: '1px solid #0F2740' }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
            {['Veteran-Owned', 'Former First Responders', 'Explainable AI', 'Secure & Compliant', 'Procurement-Ready', 'Leadership-Facing Dashboards'].map((m) => (
              <div key={m} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#0EA5E9' }} />
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#475569' }}>{m}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* WHAT WE DO */}
      <section className="py-24" style={{ backgroundColor: '#F8FAFD' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-14">
            <h2 className="text-3xl md:text-4xl font-bold" style={{ color: '#071829' }}>What We Do</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SERVICES.map((card) => (
              <a
                key={card.title}
                href={card.href}
                className="group block bg-white rounded-xl overflow-hidden transition-all duration-300"
                style={{ border: '1px solid #E1E8F5', boxShadow: '0 2px 12px rgba(7,24,41,0.06)' }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(7,24,41,0.13)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(7,24,41,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div className="overflow-hidden">
                  <img src={card.img} alt={card.alt} className="w-full object-cover transition-transform duration-500 group-hover:scale-105" style={{ height: 'auto', display: 'block' }} />
                </div>
                <div className="p-6">
                  <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#0EA5E9' }}>{card.label}</p>
                  <h3 className="text-base font-bold mb-3" style={{ color: '#071829' }}>{card.title}</h3>
                  <p className="text-sm leading-relaxed mb-4" style={{ color: '#475569' }}>{card.desc}</p>
                  <span className="text-xs font-semibold" style={{ color: '#1D4ED8' }}>Learn more →</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* BUILT FOR HIGH-STAKES OPERATIONS */}
      <section className="py-24" style={{ background: 'linear-gradient(180deg, #071829 0%, #0A1F35 100%)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#FFFFFF' }}>Built for High-Stakes Operations</h2>
            <p className="text-base leading-relaxed" style={{ color: '#475569' }}>
              Your data represents patients, crews, response times, staffing decisions, budgets, and public trust. Every system we build reflects that weight.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PILLARS.map((item) => (
              <div
                key={item.title}
                className="p-6 rounded-xl"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(14,165,233,0.15)' }}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#0EA5E9" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-sm" style={{ color: '#E2E8F0' }}>{item.title}</h3>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOCUS AREAS */}
      <section className="py-24" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-14">
            <h2 className="text-3xl md:text-4xl font-bold" style={{ color: '#071829' }}>Focus Areas</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-5xl">
            {FOCUS_AREAS.map((area) => (
              <div key={area} className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ backgroundColor: '#F8FAFD', border: '1px solid #E1E8F5' }}>
                <span className="font-bold flex-shrink-0" style={{ color: '#1D4ED8' }}>→</span>
                <span className="text-sm font-medium" style={{ color: '#1E293B' }}>{area}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SELECTED WORK */}
      <section className="py-24" style={{ backgroundColor: '#F8FAFD' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-14">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold" style={{ color: '#071829' }}>Selected Work</h2>
            </div>
            <a href="/portfolio" className="hidden md:block text-sm font-semibold" style={{ color: '#1D4ED8' }}>View all →</a>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {SELECTED_WORK.map((work) => (
              <a
                key={work.title}
                href="/portfolio"
                className="group block bg-white rounded-xl p-7 transition-all duration-300"
                style={{ border: '1px solid #E1E8F5', borderTop: '3px solid #1D4ED8', boxShadow: '0 2px 12px rgba(7,24,41,0.06)' }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(7,24,41,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(7,24,41,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#0EA5E9' }}>{work.sector}</p>
                <h3 className="text-base font-bold mb-3 leading-snug" style={{ color: '#071829' }}>{work.title}</h3>
                <p className="text-sm leading-relaxed mb-5" style={{ color: '#475569' }}>{work.desc}</p>
                <span className="text-xs font-semibold" style={{ color: '#1D4ED8' }}>View case study →</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* WHY MULLEN ANALYTICS */}
      <section className="py-24" style={{ backgroundColor: '#FFFFFF' }}>
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
                  Mullen Analytics combines real-world first responder and healthcare operations experience with advanced data science, predictive analytics, and AI development.
                </p>
                <p className="text-base leading-relaxed" style={{ color: '#1E293B' }}>
                  We understand the reality of making decisions where response times, staffing, patient outcomes, compliance, and public trust are on the line.
                </p>
                <p className="text-base leading-relaxed" style={{ color: '#1E293B' }}>
                  Our systems are built for environments where accuracy matters, accountability is expected, and every decision must be explainable and defensible.
                </p>
                <p className="text-base leading-relaxed font-semibold" style={{ color: '#071829' }}>
                  We do not build generic dashboards or experimental AI tools — we build operational systems leadership can trust, teams can use, and organizations can scale with confidence.
                </p>
              </div>
              <div className="mt-10 flex flex-wrap gap-3">
                {TRUST_BADGES.map((badge) => (
                  <span key={badge} className="px-4 py-2 rounded text-xs font-bold uppercase tracking-wider" style={{ backgroundColor: '#F0F4FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                    {badge}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Focus', value: '100%', sub: 'First Responders & Healthcare' },
                { label: 'Commitment', value: 'Operator-Level', sub: 'Domain Expertise' },
                { label: 'Output', value: 'Defensible', sub: 'Systems Leadership Can Trust' },
                { label: 'Delivery', value: 'Procurement', sub: 'Ready & Compliant' },
              ].map((stat) => (
                <div key={stat.label} className="p-6 rounded-xl" style={{ backgroundColor: '#F8FAFD', border: '1px solid #E1E8F5' }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#94A3B8' }}>{stat.label}</p>
                  <p className="text-xl font-bold mb-1" style={{ color: '#071829' }}>{stat.value}</p>
                  <p className="text-xs leading-snug" style={{ color: '#475569' }}>{stat.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-28" style={{ background: 'linear-gradient(135deg, #071829 0%, #0D2240 50%, #071829 100%)' }}>
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2
            className="text-4xl md:text-5xl font-bold mb-6 mx-auto"
            style={{ color: '#FFFFFF', lineHeight: 1.12, maxWidth: '700px', letterSpacing: '-0.02em' }}
          >
            Let&apos;s Build Smarter Systems for the People Who Respond First
          </h2>
          <p className="text-lg mb-12 mx-auto leading-relaxed" style={{ color: '#475569', maxWidth: '540px' }}>
            If your organization is ready to improve operations, reduce manual work, and make stronger leadership decisions, we should talk.
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
