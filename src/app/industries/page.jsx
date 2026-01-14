'use client';

import ContactForm from "@/components/ContactForm";

export default function IndustriesPage() {
  return (
    <div>
      {/* Hero Section - Full-width background image */}
      <section className="relative overflow-hidden" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center' }}>
        <div className="absolute inset-0" style={{ backgroundImage: 'url(/Industry%20Edge%20for%20Public%20Safety,%20Healthcare%20%26%20Operations%20hero.webp)', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.45)' }} />
        
        <div className="relative max-w-7xl mx-auto px-4 py-24">
          <div style={{ maxWidth: '640px' }}>
            <h1 className="mb-6 text-5xl font-bold" style={{ color: '#FFFFFF' }}>
              Industry Edge for Public Safety, Healthcare & Operations
            </h1>
            <p className="text-xl mb-8" style={{ color: '#E5E7EB' }}>
              Decision-grade analytics and AI for real-world outcomes
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="#contact"
                className="px-8 py-4 rounded-md font-semibold shadow-xl transition-all duration-200 hover:shadow-2xl text-center"
                style={{ backgroundColor: '#5FB3A2', color: '#0B3C5D' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#FFFFFF'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#5FB3A2'}
              >
                Talk to us
              </a>
              <a
                href="#industries"
                className="px-8 py-4 rounded-md border-2 font-semibold transition-all duration-200 text-center"
                style={{ borderColor: '#FFFFFF', color: '#FFFFFF', backgroundColor: 'transparent' }}
                onMouseEnter={(e) => { e.target.style.backgroundColor = '#FFFFFF'; e.target.style.color = '#0B3C5D'; }}
                onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = '#FFFFFF'; }}
              >
                Explore solutions
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Meet the Challenge - Context Block */}
      <section className="py-20" style={{ backgroundColor: '#F7F9FC' }}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xl leading-relaxed" style={{ color: '#1F2933', maxWidth: '640px', margin: '0 auto' }}>
            We don&apos;t just go deep. We go wide — connecting operations, finance, workforce and service delivery so you can find the opportunities others miss.
          </p>
        </div>
      </section>

      {/* Industries Grid - 2x3 with Images */}
      <section id="industries" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="mb-4" style={{ color: '#0B3C5D' }}>Industries</h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Public Safety */}
            <a href="/contact" className="group bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all border" style={{ borderColor: '#E5E7EB' }}>
              <div className="aspect-[3/2] overflow-hidden">
                <img src="/Public%20Safety%20(EMS%20:%20Fire%20:%20Police).webp" alt="Public Safety" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-3" style={{ color: '#0B3C5D' }}>Public Safety (EMS / Fire / Police)</h3>
                <p className="text-base leading-relaxed mb-4" style={{ color: '#1F2933' }}>
                  Predict demand, optimize staffing, and improve response outcomes.
                </p>
                <span className="text-sm font-semibold" style={{ color: '#2E6F95' }}>Learn more →</span>
              </div>
            </a>

            {/* Healthcare */}
            <a href="/contact" className="group bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all border" style={{ borderColor: '#E5E7EB' }}>
              <div className="aspect-[3/2] overflow-hidden">
                <img src="/Healthcare%20Operations%20(Hospitals%20:%20Trauma%20:%20Systems).jpg" alt="Healthcare Operations" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-3" style={{ color: '#0B3C5D' }}>You don’t need a data lake. You need a plan.</h3>
                <p className="text-base leading-relaxed mb-4" style={{ color: '#1F2933' }}>
                  Turn patient flow and staffing data into actionable insights.
                </p>
                <span className="text-sm font-semibold" style={{ color: '#2E6F95' }}>Learn more →</span>
              </div>
            </a>

            {/* Government */}
            <a href="/contact" className="group bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all border" style={{ borderColor: '#E5E7EB' }}>
              <div className="aspect-[3/2] overflow-hidden">
                <img src="/Government%20%26%20Procurement).webp" alt="Government & Procurement" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-3" style={{ color: '#0B3C5D' }}>Government & Procurement</h3>
                <p className="text-base leading-relaxed mb-4" style={{ color: '#1F2933' }}>
                  Analytics aligned to public-sector requirements and compliance.
                </p>
                <span className="text-sm font-semibold" style={{ color: '#2E6F95' }}>Learn more →</span>
              </div>
            </a>

            {/* Utilities */}
            <a href="/contact" className="group bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all border" style={{ borderColor: '#E5E7EB' }}>
              <div className="aspect-[3/2] overflow-hidden">
                <img src="/Utilities%20%26%20Field%20Operations.png" alt="Utilities & Field Operations" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-3" style={{ color: '#0B3C5D' }}>Utilities & Field Operations</h3>
                <p className="text-base leading-relaxed mb-4" style={{ color: '#1F2933' }}>
                  Improve reliability and resource allocation with forecasting.
                </p>
                <span className="text-sm font-semibold" style={{ color: '#2E6F95' }}>Learn more →</span>
              </div>
            </a>

            {/* SMB & Enterprise */}
            <a href="/contact" className="group bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all border" style={{ borderColor: '#E5E7EB' }}>
              <div className="aspect-[3/2] overflow-hidden">
                <img src="/SMB%20%26%20Enterprise%20Operations.avif" alt="SMB & Enterprise Operations" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-3" style={{ color: '#0B3C5D' }}>SMB & Enterprise Operations</h3>
                <p className="text-base leading-relaxed mb-4" style={{ color: '#1F2933' }}>
                  Build modern metrics and forecasting that scale efficiently.
                </p>
                <span className="text-sm font-semibold" style={{ color: '#2E6F95' }}>Learn more →</span>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Insights Section */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="border-l-4 border-[#5FB3A2] pl-6 mb-12">
            <h2 className="mb-2" style={{ color: '#0B3C5D' }}>Insights</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-lg border p-6 hover:shadow-lg transition-shadow" style={{ backgroundColor: '#F7F9FC', borderColor: '#E5E7EB' }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#0B3C5D' }}>The forecasting playbook for staffing & demand</h3>
              <p className="text-base leading-relaxed" style={{ color: '#1F2933' }}>
                How to build forecasting that leadership trusts — with clear assumptions, validation, and operational adoption.
              </p>
            </div>

            <div className="rounded-lg border p-6 hover:shadow-lg transition-shadow" style={{ backgroundColor: '#F7F9FC', borderColor: '#E5E7EB' }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#0B3C5D' }}>From dashboards to decisions: what actually drives behavior</h3>
              <p className="text-base leading-relaxed" style={{ color: '#1F2933' }}>
                The patterns that turn analytics into repeatable action: KPI design, alerting, and ownership.
              </p>
            </div>

            <div className="rounded-lg border p-6 hover:shadow-lg transition-shadow" style={{ backgroundColor: '#F7F9FC', borderColor: '#E5E7EB' }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#0B3C5D' }}>AI in the real world: moving from pilots to durable systems</h3>
              <p className="text-base leading-relaxed" style={{ color: '#1F2933' }}>
                A pragmatic approach to governance, monitoring, retraining, and ROI — without the &quot;science project&quot; trap.
              </p>
            </div>

            <div className="rounded-lg border p-6 hover:shadow-lg transition-shadow" style={{ backgroundColor: '#F7F9FC', borderColor: '#E5E7EB' }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#0B3C5D' }}>Data readiness: the fastest path to value</h3>
              <p className="text-base leading-relaxed" style={{ color: '#1F2933' }}>
                What to standardize first (and what to ignore) to get results quickly from messy operational data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Case Studies Teasers */}
      <section className="py-20" style={{ backgroundColor: '#F7F9FC' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="border-l-4 border-[#5FB3A2] pl-6 mb-12">
            <h2 className="mb-2" style={{ color: '#0B3C5D' }}>Case Studies</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow" style={{ borderColor: '#E5E7EB' }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#0B3C5D' }}>EMS workforce forecasting & scheduling modernization</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#1F2933' }}>
                Built a staffing and call-volume prediction system with operational dashboards and measurable performance improvements.
              </p>
            </div>

            <div className="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow" style={{ borderColor: '#E5E7EB' }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#0B3C5D' }}>Hospital-EMS operational intelligence & decision support</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#1F2933' }}>
                Designed an analytics framework to support cross-agency operational decisions and long-term capability planning.
              </p>
            </div>

            <div className="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow" style={{ borderColor: '#E5E7EB' }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#0B3C5D' }}>Executive KPI system for operations leadership</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#1F2933' }}>
                Created a metrics architecture and Tableau experience that aligned teams and reduced reporting friction.
              </p>
            </div>
          </div>

          <div className="text-center">
            <a
              href="/portfolio"
              className="inline-block px-8 py-4 rounded-md border-2 font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{ borderColor: '#0B3C5D', color: '#0B3C5D', backgroundColor: 'transparent' }}
              onMouseEnter={(e) => { e.target.style.backgroundColor = '#0B3C5D'; e.target.style.color = '#FFFFFF'; }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = '#0B3C5D'; }}
            >
              View all case studies
            </a>
          </div>
        </div>
      </section>

      {/* Capabilities Quick Links */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="border-l-4 border-[#5FB3A2] pl-6 mb-12">
            <h2 className="mb-2" style={{ color: '#0B3C5D' }}>Capabilities</h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <a href="/capabilities" className="flex items-center p-4 rounded-lg border hover:shadow-md transition-all" style={{ borderColor: '#E5E7EB' }}>
              <span className="mr-3 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
              <span className="font-semibold" style={{ color: '#0B3C5D' }}>Predictive Analytics & Forecasting</span>
            </a>
            <a href="/capabilities" className="flex items-center p-4 rounded-lg border hover:shadow-md transition-all" style={{ borderColor: '#E5E7EB' }}>
              <span className="mr-3 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
              <span className="font-semibold" style={{ color: '#0B3C5D' }}>Machine Learning & Model Deployment</span>
            </a>
            <a href="/capabilities" className="flex items-center p-4 rounded-lg border hover:shadow-md transition-all" style={{ borderColor: '#E5E7EB' }}>
              <span className="mr-3 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
              <span className="font-semibold" style={{ color: '#0B3C5D' }}>Tableau Dashboards & TabPy Integration</span>
            </a>
            <a href="/capabilities" className="flex items-center p-4 rounded-lg border hover:shadow-md transition-all" style={{ borderColor: '#E5E7EB' }}>
              <span className="mr-3 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
              <span className="font-semibold" style={{ color: '#0B3C5D' }}>Data Engineering & Pipelines</span>
            </a>
            <a href="/capabilities" className="flex items-center p-4 rounded-lg border hover:shadow-md transition-all" style={{ borderColor: '#E5E7EB' }}>
              <span className="mr-3 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
              <span className="font-semibold" style={{ color: '#0B3C5D' }}>Automation & Decision Workflows</span>
            </a>
            <a href="/capabilities" className="flex items-center p-4 rounded-lg border hover:shadow-md transition-all" style={{ borderColor: '#E5E7EB' }}>
              <span className="mr-3 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
              <span className="font-semibold" style={{ color: '#0B3C5D' }}>Governance, Security & Compliance Support</span>
            </a>
          </div>
        </div>
      </section>

      {/* Subscribe Section - Calm & Minimal */}
      <section className="py-20" style={{ backgroundColor: '#F7F9FC' }}>
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold" style={{ color: '#0B3C5D' }}>Our insights. Your choices.</h2>
          <p className="text-lg mb-8" style={{ color: '#4B5563' }}>
            Practical analytics & AI guidance for public safety and operations.
          </p>
          <a
            href="/contact"
            className="inline-block px-10 py-5 rounded-md font-semibold shadow-lg transition-all duration-200 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{ backgroundColor: '#5FB3A2', color: '#0B3C5D' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#FFFFFF'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#5FB3A2'}
          >
            Subscribe
          </a>
        </div>
      </section>

      {/* Final Contact CTA */}
      <section id="contact" className="bg-white py-24">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="mb-4 text-4xl font-bold" style={{ color: '#0B3C5D' }}>Let us be part of your success story</h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: '#4B5563' }}>
              Tell us what you&apos;re solving — we&apos;ll respond with a clear next step.
            </p>
          </div>
          <div className="max-w-2xl mx-auto">
            <ContactForm />
          </div>
        </div>
      </section>
    </div>
  );
}
