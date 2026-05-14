'use client';

export default function FirstResponderAnalyticsPage() {
  const benefits = [
    'Faster response times',
    'Better staffing decisions',
    'Reduced overtime costs',
    'Improved patient outcomes',
    'Less administrative burden',
    'Stronger compliance reporting',
    'Better budget justification',
    'Improved grant competitiveness',
    'Increased public trust',
    'Leadership-ready decision systems',
  ];

  const useCases = [
    { title: 'EMS Staffing Optimization', desc: 'Right-size your unit scheduling with data-driven staffing models that reduce overtime and improve coverage.' },
    { title: 'Fire Response Demand Forecasting', desc: 'Predict call volume and deployment needs by time, location, and incident type.' },
    { title: 'Response Zone Optimization', desc: 'Analyze geographic response patterns to improve placement strategy and reduce response times.' },
    { title: 'Patient Flow Analysis', desc: 'Track transport times, hospital offload delays, and unit availability to improve throughput.' },
    { title: 'QA/QI Automation', desc: 'Automate quality assurance and improvement workflows, reducing manual review burden on clinical staff.' },
    { title: 'Leadership Operational Dashboards', desc: 'Executive-level dashboards that deliver real-time situational awareness and performance metrics.' },
    { title: 'Compliance Reporting Systems', desc: 'Automated compliance and regulatory reporting aligned to state and federal requirements.' },
    { title: 'Public Safety Resource Planning', desc: 'Long-range resource and capital planning models informed by demand trends and growth projections.' },
  ];

  return (
    <div style={{ fontFamily: 'inherit' }}>

      {/* HERO IMAGE */}
      <section className="w-full overflow-hidden">
        <img
          src="/first%20responder%20hero%20image.jpeg"
          alt="First Responder Operations"
          className="w-full"
          style={{ display: 'block' }}
        />
      </section>


      {/* WHY IT MATTERS */}
      <section className="py-24" style={{ backgroundColor: '#071829' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold" style={{ color: '#FFFFFF' }}>Why Analytics Matters for First Responders</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-5">
              <p className="text-lg leading-relaxed" style={{ color: '#94A3B8' }}>
                First responders operate in environments where seconds matter, resources are limited, and every decision carries real consequences.
              </p>
              <p className="text-lg leading-relaxed" style={{ color: '#94A3B8' }}>
                Analytics, machine learning, and artificial intelligence help transform operational data into faster, smarter, and more defensible decisions.
              </p>
              <p className="text-lg leading-relaxed" style={{ color: '#94A3B8' }}>
                This is not about replacing human judgment. It is about giving leadership better tools to protect lives, improve operations, and serve communities more effectively.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              {['Operational data turned into action', 'Defensible decisions under pressure', 'Forecasting that protects lives', 'Accountability leadership can trust'].map((item) => (
                <div key={item} className="flex items-start gap-3 p-4 rounded-lg" style={{ backgroundColor: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)' }}>
                  <span className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9', marginTop: '6px' }} />
                  <span className="text-sm font-medium" style={{ color: '#E2E8F0' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* THREE CORE SERVICES */}
      <section className="py-24" style={{ backgroundColor: '#F8FAFD' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-center" style={{ color: '#071829' }}>What We Build for First Responders</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                num: '01',
                title: 'Operational Analytics',
                desc: 'Response time analysis, unit utilization, deployment strategy, overtime tracking, staffing analysis, and leadership dashboards built around how your agency actually operates.',
                tags: ['Response Time Analysis', 'Unit Utilization', 'Staffing Analysis', 'Leadership Dashboards'],
              },
              {
                num: '02',
                title: 'Predictive Modeling',
                desc: 'Demand forecasting, staffing prediction, patient surge forecasting, incident pattern recognition, and proactive deployment recommendations informed by your historical data.',
                tags: ['Demand Forecasting', 'Staffing Prediction', 'Incident Patterns', 'Proactive Deployment'],
              },
              {
                num: '03',
                title: 'AI Automation',
                desc: 'Automated reporting, incident summaries, QA/QI support, scheduling assistance, compliance workflows, and documentation automation that reduces administrative burden.',
                tags: ['Automated Reporting', 'QA/QI Support', 'Compliance Workflows', 'Documentation AI'],
              },
            ].map((card) => (
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

      {/* WHY MULLEN ANALYTICS */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-8" style={{ color: '#071829', borderLeft: '4px solid #0EA5E9', paddingLeft: '1.5rem' }}>Why Mullen Analytics</h2>
              <div className="space-y-5">
                <p className="text-lg leading-relaxed" style={{ color: '#1E293B' }}>
                  Mullen Analytics combines real-world first responder and healthcare operations experience with advanced data science, predictive analytics, and AI development.
                </p>
                <p className="text-lg leading-relaxed" style={{ color: '#1E293B' }}>
                  We understand the reality of making decisions where response times, staffing, patient outcomes, compliance, and public trust are on the line.
                </p>
                <p className="text-lg leading-relaxed" style={{ color: '#1E293B' }}>
                  Our systems are built for environments where accuracy matters, accountability is expected, and every decision must be explainable and defensible.
                </p>
                <p className="text-lg leading-relaxed font-medium" style={{ color: '#071829' }}>
                  We do not build generic dashboards or experimental AI tools — we build operational systems leadership can trust, teams can use, and organizations can scale with confidence.
                </p>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                {['Veteran-Owned', 'Former First Responders', 'Explainable AI', 'Operationally Credible'].map((badge) => (
                  <span key={badge} className="px-4 py-2 rounded-full text-sm font-semibold" style={{ backgroundColor: '#071829', color: '#FFFFFF' }}>{badge}</span>
                ))}
              </div>
            </div>
            <div className="rounded-xl overflow-hidden shadow-xl">
              <img
                src="/Public%20Safety%20(EMS%20Fire%20Police).webp"
                alt="First Responder Operations"
                className="w-full h-full object-cover"
                style={{ minHeight: '420px' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="py-24" style={{ backgroundColor: '#F8FAFD' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-center" style={{ color: '#071829' }}>Common First Responder Use Cases</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {useCases.map((uc, i) => (
              <div
                key={uc.title}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 border-b-2"
                style={{ borderBottomColor: '#0EA5E9' }}
              >
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#0EA5E9' }}>{String(i + 1).padStart(2, '0')}</p>
                <h3 className="font-bold mb-3 text-base" style={{ color: '#071829' }}>{uc.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-28" style={{ background: 'linear-gradient(135deg, #071829 0%, #0D2240 50%, #071829 100%)' }}>
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-center" style={{ color: '#FFFFFF', lineHeight: 1.2 }}>
            Better Decisions Start<br />with Better Data
          </h2>
          <p className="text-xl mb-12 mx-auto leading-relaxed text-center" style={{ color: '#94A3B8', maxWidth: '560px' }}>
            If your organization is ready to improve operations, reduce inefficiencies, and make stronger leadership decisions, we should talk.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/contact"
              className="px-10 py-5 rounded-md font-semibold text-lg shadow-xl transition-all duration-200 text-center"
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
              className="px-10 py-5 rounded-md border-2 font-semibold text-lg transition-all duration-200 text-center"
              style={{ borderColor: '#FFFFFF', color: '#FFFFFF', backgroundColor: 'transparent' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; e.currentTarget.style.color = '#071829'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#FFFFFF'; }}
            >
              Schedule a Strategy Call
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
