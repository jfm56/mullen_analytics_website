'use client';

export default function Home() {
  return (
    <div>
      {/* Hero Section - PwC Style */}
      <section className="relative h-[75vh] overflow-hidden">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/Hero%20image.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.3)'
          }}
        />
        
        <div className="relative h-full max-w-7xl mx-auto px-4 flex items-center">
          <div style={{ maxWidth: '640px' }}>
            <h1 className="text-5xl md:text-6xl mb-6" style={{ color: '#FFFFFF', fontWeight: 700, lineHeight: 1.15 }}>
              Analytics and AI for decisions you have to defend
            </h1>
            <p className="text-xl mb-6" style={{ color: '#FFFFFF', lineHeight: 1.5 }}>
              We design forecasting, analytics, and decision systems for high-stakes environments where accountability matters.
            </p>
            <p className="text-base mb-10" style={{ color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.6 }}>
              Trusted by public safety, healthcare, and government teams to turn complex data into confident action.
            </p>
            <a
              href="/capabilities"
              className="inline-block px-8 py-4 rounded-md border-2 border-white text-white font-semibold transition-all duration-200 hover:bg-white hover:text-[#0B3C5D] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent"
            >
              Explore now
            </a>
          </div>
        </div>
      </section>

      {/* Featured Insights - 3 Cards */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="group cursor-pointer">
            <div className="aspect-[4/3] bg-gray-200 rounded-lg mb-4 overflow-hidden">
              <img src="/AI Forecasting for Workforce Planning.png" alt="AI Forecasting for Workforce Planning" className="w-full h-full object-cover" />
            </div>
            <h3 className="text-xl font-semibold mb-2 group-hover:text-[#2E6F95] transition-colors" style={{ color: '#0B3C5D' }}>
              AI Forecasting for Workforce Planning
            </h3>
            <p className="text-sm" style={{ color: '#4B5563' }}>
              How to build forecasting that leadership trusts and operations can act on.
            </p>
          </div>

          <div className="group cursor-pointer">
            <div className="aspect-[4/3] bg-gray-200 rounded-lg mb-4 overflow-hidden">
              <img src="/From Dashboards to Decisions.png" alt="From Dashboards to Decisions" className="w-full h-full object-cover" />
            </div>
            <h3 className="text-xl font-semibold mb-2 group-hover:text-[#2E6F95] transition-colors" style={{ color: '#0B3C5D' }}>
              From Dashboards to Decisions
            </h3>
            <p className="text-sm" style={{ color: '#4B5563' }}>
              The patterns that turn analytics into repeatable action and measurable outcomes.
            </p>
          </div>

          <div className="group cursor-pointer">
            <div className="aspect-[4/3] bg-gray-200 rounded-lg mb-4 overflow-hidden">
              <img src="/Operational Analytics That Leadership Trusts.png" alt="Operational Analytics That Leadership Trusts" className="w-full h-full object-cover" />
            </div>
            <h3 className="text-xl font-semibold mb-2 group-hover:text-[#2E6F95] transition-colors" style={{ color: '#0B3C5D' }}>
              Operational Analytics That Leadership Trusts
            </h3>
            <p className="text-sm" style={{ color: '#4B5563' }}>
              Building analytics systems that support accountability in regulated environments.
            </p>
          </div>
        </div>
      </section>

      {/* Flagship Narrative Section - Two Column */}
      <section className="py-20" style={{ backgroundColor: '#F7F9FC' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-semibold mb-6 leading-tight" style={{ color: '#0B3C5D' }}>
                We deliver expertise where it matters most
              </h2>
              <p className="text-lg leading-relaxed mb-4" style={{ color: '#1F2933' }}>
                Organizations operating in high-stakes environments need analytics and AI they can defend. We help public agencies, healthcare systems, and mission-critical operations turn complex data into confident decisions.
              </p>
              <p className="text-lg leading-relaxed mb-6" style={{ color: '#1F2933' }}>
                Our work is built on operational experience, disciplined methodology, and a commitment to transparency. We don't just deliver models—we deliver systems that endure.
              </p>
              <a href="/about" className="text-base font-semibold transition-colors" style={{ color: '#2E6F95' }} onMouseEnter={(e) => e.target.style.color = '#0B3C5D'} onMouseLeave={(e) => e.target.style.color = '#2E6F95'}>
                Learn more →
              </a>
            </div>
            <div className="aspect-[4/3] bg-gray-200 rounded-lg overflow-hidden">
              <img src="/We deliver expertise where it matters most.webp" alt="We deliver expertise where it matters most" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Case Studies Section */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-semibold mb-3" style={{ color: '#0B3C5D' }}>
          Selected Work
        </h2>
        <p className="text-lg mb-12" style={{ color: '#4B5563' }}>
          Examples of analytics and AI delivered for operational decision-making.
        </p>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow" style={{ borderColor: '#E5E7EB' }}>
            <p className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#2E6F95' }}>
              EMS Operations
            </p>
            <h3 className="text-lg font-semibold mb-3" style={{ color: '#0B3C5D' }}>
              Demand forecasting and staffing optimization for emergency services
            </h3>
            <p className="text-sm mb-4" style={{ color: '#4B5563' }}>
              Built predictive models and operational dashboards to support resource allocation decisions.
            </p>
            <a href="/portfolio" className="text-sm font-semibold transition-colors" style={{ color: '#2E6F95' }} onMouseEnter={(e) => e.target.style.color = '#0B3C5D'} onMouseLeave={(e) => e.target.style.color = '#2E6F95'}>
              Learn more →
            </a>
          </div>

          <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow" style={{ borderColor: '#E5E7EB' }}>
            <p className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#2E6F95' }}>
              Healthcare Analytics
            </p>
            <h3 className="text-lg font-semibold mb-3" style={{ color: '#0B3C5D' }}>
              Explainable machine learning for medical classification
            </h3>
            <p className="text-sm mb-4" style={{ color: '#4B5563' }}>
              Developed interpretable models designed for transparency and clinical accountability.
            </p>
            <a href="/portfolio" className="text-sm font-semibold transition-colors" style={{ color: '#2E6F95' }} onMouseEnter={(e) => e.target.style.color = '#0B3C5D'} onMouseLeave={(e) => e.target.style.color = '#2E6F95'}>
              Learn more →
            </a>
          </div>

          <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow" style={{ borderColor: '#E5E7EB' }}>
            <p className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#2E6F95' }}>
              Systems Engineering
            </p>
            <h3 className="text-lg font-semibold mb-3" style={{ color: '#0B3C5D' }}>
              Secure backend architecture with role-based access control
            </h3>
            <p className="text-sm mb-4" style={{ color: '#4B5563' }}>
              Delivered production-ready systems with authentication, testing, and security controls.
            </p>
            <a href="/portfolio" className="text-sm font-semibold transition-colors" style={{ color: '#2E6F95' }} onMouseEnter={(e) => e.target.style.color = '#0B3C5D'} onMouseLeave={(e) => e.target.style.color = '#2E6F95'}>
              Learn more →
            </a>
          </div>
        </div>
      </section>

      {/* Industry Highlights */}
      <section className="py-20" style={{ backgroundColor: '#F7F9FC' }}>
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-semibold mb-12" style={{ color: '#0B3C5D' }}>
            Industries We Serve
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <a href="/industries" className="block p-6 border rounded-lg hover:shadow-md transition-all bg-white" style={{ borderColor: '#E5E7EB' }}>
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#0B3C5D' }}>
                Public Safety
              </h3>
              <p className="text-sm" style={{ color: '#4B5563' }}>
                EMS, fire, and police analytics for demand forecasting and operational performance.
              </p>
            </a>

            <a href="/industries" className="block p-6 border rounded-lg hover:shadow-md transition-all bg-white" style={{ borderColor: '#E5E7EB' }}>
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#0B3C5D' }}>
                Healthcare Operations
              </h3>
              <p className="text-sm" style={{ color: '#4B5563' }}>
                Patient flow, staffing, and operational intelligence for hospitals and health systems.
              </p>
            </a>

            <a href="/industries" className="block p-6 border rounded-lg hover:shadow-md transition-all bg-white" style={{ borderColor: '#E5E7EB' }}>
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#0B3C5D' }}>
                Government & Procurement
              </h3>
              <p className="text-sm" style={{ color: '#4B5563' }}>
                NJSTART-ready analytics and AI services aligned to public-sector requirements.
              </p>
            </a>

            <a href="/industries" className="block p-6 border rounded-lg hover:shadow-md transition-all bg-white" style={{ borderColor: '#E5E7EB' }}>
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#0B3C5D' }}>
                Utilities & Field Operations
              </h3>
              <p className="text-sm" style={{ color: '#4B5563' }}>
                Reliability, scheduling, and resource allocation across crews and assets.
              </p>
            </a>

            <a href="/industries" className="block p-6 border rounded-lg hover:shadow-md transition-all bg-white" style={{ borderColor: '#E5E7EB' }}>
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#0B3C5D' }}>
                Enterprise Operations
              </h3>
              <p className="text-sm" style={{ color: '#4B5563' }}>
                Modern metrics, forecasting, and decision systems for finance and supply chain.
              </p>
            </a>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4" style={{ color: '#0B3C5D' }}>
            Let's talk about what you're solving
          </h2>
          <p className="text-lg mb-10 max-w-2xl mx-auto" style={{ color: '#4B5563' }}>
            Whether you're exploring an initial analytics initiative or scaling an existing program, we can help you move from data to defensible decisions.
          </p>
          <a
            href="/contact"
            className="inline-block px-10 py-5 rounded-md font-semibold shadow-lg transition-all duration-200 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{ backgroundColor: '#0B3C5D', color: '#FFFFFF' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#2E6F95'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#0B3C5D'}
          >
            Start a conversation
          </a>
        </div>
      </section>
    </div>
  );
}
