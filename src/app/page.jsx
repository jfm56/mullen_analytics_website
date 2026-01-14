'use client';

export default function Home() {
  return (
    <div>
      {/* Hero Section - Authority First */}
      <section className="relative overflow-hidden" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center' }}>
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/Hero%20image.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.3)'
          }}
        />
        
        <div className="relative max-w-7xl mx-auto px-4 py-24">
          <div style={{ maxWidth: '620px' }}>
            <h1 className="text-5xl md:text-6xl mb-6 font-bold" style={{ color: '#FFFFFF', lineHeight: 1.15 }}>
              Analytics and AI for decisions you have to defend
            </h1>
            <p className="text-xl mb-10" style={{ color: '#E5E7EB', lineHeight: 1.6 }}>
              We design forecasting, analytics, and decision systems for high-stakes environments where accountability matters.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="/capabilities"
                className="px-8 py-4 rounded-md font-semibold shadow-xl transition-all duration-200 hover:shadow-2xl text-center"
                style={{ backgroundColor: '#5FB3A2', color: '#0B3C5D' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#FFFFFF'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#5FB3A2'}
              >
                Explore Capabilities
              </a>
              <a
                href="/contact"
                className="px-8 py-4 rounded-md border-2 font-semibold transition-all duration-200 text-center"
                style={{ borderColor: '#FFFFFF', color: '#FFFFFF', backgroundColor: 'transparent' }}
                onMouseEnter={(e) => { e.target.style.backgroundColor = '#FFFFFF'; e.target.style.color = '#0B3C5D'; }}
                onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = '#FFFFFF'; }}
              >
                Start a Conversation
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Strip - Reduce Skepticism */}
      <section className="py-12" style={{ backgroundColor: '#0B3C5D' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-6">
            <p className="text-lg" style={{ color: '#E5E7EB' }}>
              Trusted by public safety, healthcare, and government teams
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            <div className="flex items-center gap-2">
              <span className="text-lg" style={{ color: '#5FB3A2' }}>✓</span>
              <span style={{ color: '#FFFFFF' }}>Defensible models</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg" style={{ color: '#5FB3A2' }}>✓</span>
              <span style={{ color: '#FFFFFF' }}>Explainable AI</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg" style={{ color: '#5FB3A2' }}>✓</span>
              <span style={{ color: '#FFFFFF' }}>Procurement-ready delivery</span>
            </div>
          </div>
        </div>
      </section>

      {/* What You Actually Do - 3 Column Cards */}
      <section className="py-20" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4" style={{ color: '#0B3C5D' }}>What We Do</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg overflow-hidden border-2 hover:shadow-lg transition-all" style={{ borderColor: '#5FB3A2' }}>
              <div className="aspect-[4/3] overflow-hidden">
                <img src="/Forecasting%20%26%20Prediction.png" alt="Forecasting & Prediction" className="w-full h-full object-cover" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-3" style={{ color: '#0B3C5D' }}>
                  Forecasting & Prediction
                </h3>
                <p className="text-base mb-4" style={{ color: '#4B5563' }}>
                  Build defensible models for staffing, demand, and operational planning.
                </p>
                <a href="/capabilities" className="text-sm font-semibold" style={{ color: '#2E6F95' }}>Learn more →</a>
              </div>
            </div>

            <div className="bg-white rounded-lg overflow-hidden border-2 hover:shadow-lg transition-all" style={{ borderColor: '#5FB3A2' }}>
              <div className="aspect-[4/3] overflow-hidden">
                <img src="/Decision%20Dashboards.png" alt="Decision Dashboards" className="w-full h-full object-cover" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-3" style={{ color: '#0B3C5D' }}>
                  Decision Dashboards
                </h3>
                <p className="text-base mb-4" style={{ color: '#4B5563' }}>
                  Turn data into action with dashboards that drive operational decisions.
                </p>
                <a href="/capabilities" className="text-sm font-semibold" style={{ color: '#2E6F95' }}>Learn more →</a>
              </div>
            </div>

            <div className="bg-white rounded-lg overflow-hidden border-2 hover:shadow-lg transition-all" style={{ borderColor: '#5FB3A2' }}>
              <div className="aspect-[4/3] overflow-hidden">
                <img src="/AI%20%26%20Automation.jpg" alt="AI & Automation" className="w-full h-full object-cover" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-3" style={{ color: '#0B3C5D' }}>
                  AI & Automation
                </h3>
                <p className="text-base mb-4" style={{ color: '#4B5563' }}>
                  Deploy explainable AI systems that integrate with your workflows.
                </p>
                <a href="/capabilities" className="text-sm font-semibold" style={{ color: '#2E6F95' }}>Learn more →</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* From Insight to Action - Editorial Cards */}
      <section className="py-20" style={{ backgroundColor: '#F7F9FC' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold" style={{ color: '#0B3C5D' }}>From Dashboards to Decisions</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#0B3C5D' }}>
                AI Forecasting for Workforce Planning
              </h3>
              <p className="text-sm" style={{ color: '#4B5563' }}>
                How to build forecasting that leadership trusts and operations can act on.
              </p>
            </div>

            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#0B3C5D' }}>
                The Patterns That Drive Action
              </h3>
              <p className="text-sm" style={{ color: '#4B5563' }}>
                KPI design, alerting, and ownership that turn analytics into repeatable outcomes.
              </p>
            </div>

            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#0B3C5D' }}>
                Operational Analytics That Leadership Trusts
              </h3>
              <p className="text-sm" style={{ color: '#4B5563' }}>
                Building analytics systems that support accountability in regulated environments.
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* Proof - Selected Work */}
      <section className="py-20" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-3" style={{ color: '#0B3C5D' }}>Selected Work</h2>
            <p className="text-lg" style={{ color: '#4B5563' }}>
              Examples of analytics and AI delivered for operational decision-making.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg p-6 border-2 hover:shadow-lg transition-all" style={{ borderColor: '#E5E7EB' }}>
              <p className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#2E6F95' }}>
                EMS Operations
              </p>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#0B3C5D' }}>
                Demand forecasting and staffing optimization
              </h3>
              <p className="text-sm mb-4" style={{ color: '#4B5563' }}>
                Predictive models and dashboards supporting resource allocation decisions.
              </p>
              <a href="/portfolio" className="text-sm font-semibold" style={{ color: '#2E6F95' }}>View case study →</a>
            </div>

            <div className="bg-white rounded-lg p-6 border-2 hover:shadow-lg transition-all" style={{ borderColor: '#E5E7EB' }}>
              <p className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#2E6F95' }}>
                Healthcare Analytics
              </p>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#0B3C5D' }}>
                Explainable ML for medical classification
              </h3>
              <p className="text-sm mb-4" style={{ color: '#4B5563' }}>
                Interpretable models designed for transparency and clinical accountability.
              </p>
              <a href="/portfolio" className="text-sm font-semibold" style={{ color: '#2E6F95' }}>View case study →</a>
            </div>

            <div className="bg-white rounded-lg p-6 border-2 hover:shadow-lg transition-all" style={{ borderColor: '#E5E7EB' }}>
              <p className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#2E6F95' }}>
                Systems Engineering
              </p>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#0B3C5D' }}>
                Secure backend with role-based access
              </h3>
              <p className="text-sm mb-4" style={{ color: '#4B5563' }}>
                Production-ready systems with authentication and security controls.
              </p>
              <a href="/portfolio" className="text-sm font-semibold" style={{ color: '#2E6F95' }}>View case study →</a>
            </div>
          </div>
        </div>
      </section>

      {/* Industries - Self-Identification */}
      <section className="py-16" style={{ backgroundColor: '#F7F9FC' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold" style={{ color: '#0B3C5D' }}>Industries</h2>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="/industries" className="px-6 py-3 bg-white rounded-lg border-2 hover:shadow-md transition-all" style={{ borderColor: '#5FB3A2' }}>
              <span className="font-semibold" style={{ color: '#0B3C5D' }}>Public Safety</span>
            </a>
            <a href="/industries" className="px-6 py-3 bg-white rounded-lg border-2 hover:shadow-md transition-all" style={{ borderColor: '#5FB3A2' }}>
              <span className="font-semibold" style={{ color: '#0B3C5D' }}>Healthcare</span>
            </a>
            <a href="/industries" className="px-6 py-3 bg-white rounded-lg border-2 hover:shadow-md transition-all" style={{ borderColor: '#5FB3A2' }}>
              <span className="font-semibold" style={{ color: '#0B3C5D' }}>Government</span>
            </a>
            <a href="/industries" className="px-6 py-3 bg-white rounded-lg border-2 hover:shadow-md transition-all" style={{ borderColor: '#5FB3A2' }}>
              <span className="font-semibold" style={{ color: '#0B3C5D' }}>Utilities</span>
            </a>
            <a href="/industries" className="px-6 py-3 bg-white rounded-lg border-2 hover:shadow-md transition-all" style={{ borderColor: '#5FB3A2' }}>
              <span className="font-semibold" style={{ color: '#0B3C5D' }}>Enterprise</span>
            </a>
          </div>
        </div>
      </section>

      {/* Why Mullen Analytics - Differentiation */}
      <section className="py-20" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold" style={{ color: '#0B3C5D' }}>Why Mullen Analytics</h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="flex items-start gap-3">
              <span className="text-xl" style={{ color: '#5FB3A2' }}>✓</span>
              <div>
                <h3 className="font-semibold mb-1" style={{ color: '#0B3C5D' }}>Operational experience</h3>
                <p className="text-sm" style={{ color: '#4B5563' }}>Built on real-world operations, not theory</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl" style={{ color: '#5FB3A2' }}>✓</span>
              <div>
                <h3 className="font-semibold mb-1" style={{ color: '#0B3C5D' }}>Explainable, defensible models</h3>
                <p className="text-sm" style={{ color: '#4B5563' }}>Transparent AI you can trust</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl" style={{ color: '#5FB3A2' }}>✓</span>
              <div>
                <h3 className="font-semibold mb-1" style={{ color: '#0B3C5D' }}>Real-world adoption focus</h3>
                <p className="text-sm" style={{ color: '#4B5563' }}>Systems people actually use</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl" style={{ color: '#5FB3A2' }}>✓</span>
              <div>
                <h3 className="font-semibold mb-1" style={{ color: '#0B3C5D' }}>Procurement & compliance ready</h3>
                <p className="text-sm" style={{ color: '#4B5563' }}>Built for public sector requirements</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl" style={{ color: '#5FB3A2' }}>✓</span>
              <div>
                <h3 className="font-semibold mb-1" style={{ color: '#0B3C5D' }}>Systems that endure</h3>
                <p className="text-sm" style={{ color: '#4B5563' }}>Production-ready, not prototypes</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl" style={{ color: '#5FB3A2' }}>✓</span>
              <div>
                <h3 className="font-semibold mb-1" style={{ color: '#0B3C5D' }}>Direct senior engagement</h3>
                <p className="text-sm" style={{ color: '#4B5563' }}>Access to leadership and expertise</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA - Calm Confidence */}
      <section className="py-24" style={{ backgroundColor: '#F7F9FC' }}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4" style={{ color: '#0B3C5D' }}>
            Let&apos;s talk about what you&apos;re solving
          </h2>
          <p className="text-xl mb-10" style={{ color: '#4B5563', maxWidth: '620px', margin: '0 auto 2.5rem' }}>
            Move from data to defensible decisions.
          </p>
          <a
            href="/contact"
            className="inline-block px-12 py-6 rounded-md font-semibold text-lg shadow-xl transition-all duration-200 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{ backgroundColor: '#5FB3A2', color: '#0B3C5D' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#FFFFFF'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#5FB3A2'}
          >
            Start a Conversation
          </a>
        </div>
      </section>
    </div>
  );
}
