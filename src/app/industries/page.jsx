'use client';

import ContactForm from "@/components/ContactForm";

export default function IndustriesPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden" style={{ backgroundColor: '#0B3C5D' }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url(/particle-wave.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        
        <div className="relative max-w-7xl mx-auto px-4 py-24 md:py-32">
          <div className="max-w-4xl">
            <div className="border-l-4 border-[#5FB3A2] pl-6 mb-8">
              <h1 className="mb-6" style={{ color: '#FFB88C' }}>
                Industry Edge for Public Safety, Healthcare & Operations
              </h1>
            </div>
            <div className="h-px bg-[#5FB3A2] w-24 mb-8" />
            <p className="text-xl text-gray-200 leading-relaxed max-w-3xl mb-10">
              Go beyond dashboards with <em className="font-semibold">decision-grade</em> analytics and AI — where operational data, forecasting, and automation unlock measurable outcomes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="#contact"
                className="px-8 py-4 rounded-md font-semibold shadow-lg transition-all duration-200 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#0B3C5D] text-center"
                style={{ backgroundColor: '#FFFFFF', color: '#0B3C5D' }}
              >
                Talk to us
              </a>
              <a
                href="#industries"
                className="px-8 py-4 rounded-md border-2 font-semibold transition-all duration-200 hover:bg-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#0B3C5D] text-center"
                style={{ borderColor: '#FFFFFF', color: '#FFFFFF' }}
                onMouseEnter={(e) => { e.target.style.backgroundColor = '#FFFFFF'; e.target.style.color = '#0B3C5D'; }}
                onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = '#FFFFFF'; }}
              >
                Explore solutions
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Meet the Challenge */}
      <section className="bg-white py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="border-l-4 border-[#5FB3A2] pl-6 mb-8">
            <h2 className="mb-6" style={{ color: '#0B3C5D' }}>Meet the challenge of the future</h2>
          </div>
          <div className="max-w-3xl space-y-6">
            <p className="text-lg leading-relaxed" style={{ color: '#1F2933' }}>
              We don't just go deep. We go wide — connecting operations, finance, workforce and service delivery so you can find the opportunities others miss.
            </p>
            <p className="text-lg leading-relaxed" style={{ color: '#1F2933' }}>
              With Mullen Analytics, you do more than optimize. You <strong>predict</strong>, <strong>prioritize</strong>, and <strong>prove impact</strong> — with models and dashboards built for real-world decisions.
            </p>
          </div>
          
          <div className="mt-10 bg-gray-50 rounded-lg p-8 border" style={{ borderColor: '#E5E7EB' }}>
            <h3 className="text-xl font-semibold mb-6" style={{ color: '#0B3C5D' }}>What you get:</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start">
                <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                <span style={{ color: '#1F2933' }}>Forecasting you can defend (staffing, demand, outcomes)</span>
              </div>
              <div className="flex items-start">
                <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                <span style={{ color: '#1F2933' }}>Dashboards that drive action (not just reporting)</span>
              </div>
              <div className="flex items-start">
                <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                <span style={{ color: '#1F2933' }}>AI that fits your workflow (TabPy/Tableau, APIs, automation)</span>
              </div>
              <div className="flex items-start">
                <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                <span style={{ color: '#1F2933' }}>Governance and security ready for procurement and RFPs</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Industries Section */}
      <section id="industries" className="py-20" style={{ backgroundColor: '#F7F9FC' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="border-l-4 border-[#5FB3A2] pl-6 mb-12">
            <h2 className="mb-2" style={{ color: '#0B3C5D' }}>Industries</h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Public Safety */}
            <div className="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow" style={{ borderColor: '#E5E7EB' }}>
              <h3 className="text-xl font-semibold mb-3" style={{ color: '#0B3C5D' }}>Public Safety (EMS / Fire / Police)</h3>
              <p className="text-base leading-relaxed mb-4" style={{ color: '#1F2933' }}>
                Predict demand, optimize staffing, reduce overtime, and improve response outcomes with operational forecasting and performance analytics.
              </p>
              <a href="/contact" className="text-sm font-semibold transition-colors" style={{ color: '#2E6F95' }} onMouseEnter={(e) => e.target.style.color = '#0B3C5D'} onMouseLeave={(e) => e.target.style.color = '#2E6F95'}>
                Learn more →
              </a>
            </div>

            {/* Healthcare */}
            <div className="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow" style={{ borderColor: '#E5E7EB' }}>
              <h3 className="text-xl font-semibold mb-3" style={{ color: '#0B3C5D' }}>Healthcare Operations (Hospitals / Trauma / Systems)</h3>
              <p className="text-base leading-relaxed mb-4" style={{ color: '#1F2933' }}>
                Turn patient flow, staffing, and throughput data into actionable insights — with forecasting, optimization, and operational KPI systems.
              </p>
              <a href="/contact" className="text-sm font-semibold transition-colors" style={{ color: '#2E6F95' }} onMouseEnter={(e) => e.target.style.color = '#0B3C5D'} onMouseLeave={(e) => e.target.style.color = '#2E6F95'}>
                Learn more →
              </a>
            </div>

            {/* Government */}
            <div className="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow" style={{ borderColor: '#E5E7EB' }}>
              <h3 className="text-xl font-semibold mb-3" style={{ color: '#0B3C5D' }}>Government & Procurement (NJSTART-ready)</h3>
              <p className="text-base leading-relaxed mb-4" style={{ color: '#1F2933' }}>
                Analytics and AI services aligned to public-sector requirements: documentation, controls, compliance language, and measurable deliverables.
              </p>
              <a href="/contact" className="text-sm font-semibold transition-colors" style={{ color: '#2E6F95' }} onMouseEnter={(e) => e.target.style.color = '#0B3C5D'} onMouseLeave={(e) => e.target.style.color = '#2E6F95'}>
                Learn more →
              </a>
            </div>

            {/* Utilities */}
            <div className="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow" style={{ borderColor: '#E5E7EB' }}>
              <h3 className="text-xl font-semibold mb-3" style={{ color: '#0B3C5D' }}>Utilities & Field Operations</h3>
              <p className="text-base leading-relaxed mb-4" style={{ color: '#1F2933' }}>
                Improve reliability, scheduling, and resource allocation with forecasting and performance measurement across crews, assets, and service requests.
              </p>
              <a href="/contact" className="text-sm font-semibold transition-colors" style={{ color: '#2E6F95' }} onMouseEnter={(e) => e.target.style.color = '#0B3C5D'} onMouseLeave={(e) => e.target.style.color = '#2E6F95'}>
                Learn more →
              </a>
            </div>

            {/* SMB & Enterprise */}
            <div className="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow" style={{ borderColor: '#E5E7EB' }}>
              <h3 className="text-xl font-semibold mb-3" style={{ color: '#0B3C5D' }}>SMB & Enterprise Operations</h3>
              <p className="text-base leading-relaxed mb-4" style={{ color: '#1F2933' }}>
                From finance to supply chain: build modern metrics, forecasting, and decision systems that scale without adding headcount.
              </p>
              <a href="/contact" className="text-sm font-semibold transition-colors" style={{ color: '#2E6F95' }} onMouseEnter={(e) => e.target.style.color = '#0B3C5D'} onMouseLeave={(e) => e.target.style.color = '#2E6F95'}>
                Learn more →
              </a>
            </div>
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
                A pragmatic approach to governance, monitoring, retraining, and ROI — without the "science project" trap.
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

      {/* Subscribe Section */}
      <section className="py-20" style={{ backgroundColor: '#F7F9FC' }}>
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="border-l-4 border-[#5FB3A2] pl-6 mb-8 inline-block text-left">
            <h2 className="mb-2" style={{ color: '#0B3C5D' }}>Subscribe</h2>
          </div>
          <p className="text-xl mb-8" style={{ color: '#1F2933' }}>
            <strong>Our insights. Your choices.</strong><br />
            Get practical analytics & AI guidance for public safety and operations — written for decision-makers.
          </p>
          <a
            href="/contact"
            className="inline-block px-10 py-5 rounded-md font-semibold shadow-lg transition-all duration-200 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{ backgroundColor: '#0B3C5D', color: '#FFFFFF' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#2E6F95'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#0B3C5D'}
          >
            Subscribe
          </a>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="bg-white py-20">
        <div className="max-w-3xl mx-auto px-4">
          <div className="border-l-4 border-[#5FB3A2] pl-6 mb-8">
            <h2 className="mb-4" style={{ color: '#0B3C5D' }}>Let us be part of your success story.</h2>
          </div>
          <p className="text-lg mb-10 max-w-2xl" style={{ color: '#1F2933' }}>
            Tell us what you're solving — we'll respond with a clear next step, recommended approach, and what we'd need to start.
          </p>
          <ContactForm />
          <p className="text-sm text-center mt-6" style={{ color: '#4B5563' }}>
            Your information will be handled in accordance with our Privacy Statement. You can opt out at any time.
          </p>
        </div>
      </section>
    </div>
  );
}
