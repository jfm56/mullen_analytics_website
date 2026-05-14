'use client';

import ContactForm from "@/components/ContactForm";

export default function IndustriesPage() {
  return (
    <div>
      {/* Hero Section - Full-width background image */}
      <section className="relative overflow-hidden" style={{ minHeight: '70vh' }}>
        <img src="/first%20responder%20hero%20image.jpeg" alt="First Responder Hero" className="w-full h-full object-cover" style={{ display: 'block', minHeight: '70vh' }} />
      </section>

      {/* Meet the Challenge - Context Block */}
      <section className="py-20" style={{ backgroundColor: '#F8FAFD' }}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xl leading-relaxed" style={{ color: '#1E293B', maxWidth: '640px', margin: '0 auto' }}>
            EMS, fire, hospitals, and healthcare operations are not peripheral markets for us — they are the entire focus. That specialization means faster time to value, deeper domain fluency, and analytics systems your teams will actually trust and use.
          </p>
        </div>
      </section>

      {/* Industries Grid - 2x3 with Images */}
      <section id="industries" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="mb-4" style={{ color: '#071829' }}>Industries</h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* EMS */}
            <a href="/contact" className="group bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all border" style={{ borderColor: '#E5E7EB' }}>
              <div className="aspect-[3/2] overflow-hidden">
                <img src="/Public%20Safety%20(EMS%20Fire%20Police).webp" alt="EMS & Fire" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-3" style={{ color: '#071829' }}>EMS & Fire Services</h3>
                <p className="text-base leading-relaxed mb-4" style={{ color: '#1E293B' }}>
                  Demand forecasting, staffing models, response time analysis, unit utilization, and operational performance dashboards for EMS and fire agencies.
                </p>
                <span className="text-sm font-semibold" style={{ color: '#1D4ED8' }}>Start a conversation →</span>
              </div>
            </a>

            {/* Healthcare */}
            <a href="/contact" className="group bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all border" style={{ borderColor: '#E5E7EB' }}>
              <div className="aspect-[3/2] overflow-hidden">
                <img src="/Healthcare%20Operations%20(Hospitals%20%20Trauma%20%20Systems).jpg" alt="Healthcare Operations" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-3" style={{ color: '#071829' }}>Hospitals & Healthcare Systems</h3>
                <p className="text-base leading-relaxed mb-4" style={{ color: '#1E293B' }}>
                  Patient flow analytics, quality improvement reporting, clinical operations dashboards, AI-assisted documentation, and healthcare decision support systems.
                </p>
                <span className="text-sm font-semibold" style={{ color: '#1D4ED8' }}>Start a conversation →</span>
              </div>
            </a>

            {/* Public Safety */}
            <a href="/contact" className="group bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all border" style={{ borderColor: '#E5E7EB' }}>
              <div className="aspect-[3/2] overflow-hidden">
                <img src="/Government%20%26%20Procurement).webp" alt="Public Safety" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-3" style={{ color: '#071829' }}>Public Safety & Government</h3>
                <p className="text-base leading-relaxed mb-4" style={{ color: '#1E293B' }}>
                  Performance dashboards, predictive analytics, and AI systems aligned to public-sector compliance, procurement requirements, and leadership accountability.
                </p>
                <span className="text-sm font-semibold" style={{ color: '#1D4ED8' }}>Start a conversation →</span>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Insights Section */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="border-l-4 border-[#0EA5E9] pl-6 mb-12">
            <h2 className="mb-2" style={{ color: '#071829' }}>Insights</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-lg border p-6 hover:shadow-lg transition-shadow" style={{ backgroundColor: '#F8FAFD', borderColor: '#E5E7EB' }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#071829' }}>The forecasting playbook for staffing & demand</h3>
              <p className="text-base leading-relaxed" style={{ color: '#1E293B' }}>
                How to build forecasting that leadership trusts — with clear assumptions, validation, and operational adoption.
              </p>
            </div>

            <div className="rounded-lg border p-6 hover:shadow-lg transition-shadow" style={{ backgroundColor: '#F8FAFD', borderColor: '#E5E7EB' }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#071829' }}>From dashboards to decisions: what actually drives behavior</h3>
              <p className="text-base leading-relaxed" style={{ color: '#1E293B' }}>
                The patterns that turn analytics into repeatable action: KPI design, alerting, and ownership.
              </p>
            </div>

            <div className="rounded-lg border p-6 hover:shadow-lg transition-shadow" style={{ backgroundColor: '#F8FAFD', borderColor: '#E5E7EB' }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#071829' }}>AI in the real world: moving from pilots to durable systems</h3>
              <p className="text-base leading-relaxed" style={{ color: '#1E293B' }}>
                A pragmatic approach to governance, monitoring, retraining, and ROI — without the &quot;science project&quot; trap.
              </p>
            </div>

            <div className="rounded-lg border p-6 hover:shadow-lg transition-shadow" style={{ backgroundColor: '#F8FAFD', borderColor: '#E5E7EB' }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#071829' }}>Data readiness: the fastest path to value</h3>
              <p className="text-base leading-relaxed" style={{ color: '#1E293B' }}>
                What to standardize first (and what to ignore) to get results quickly from messy operational data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Case Studies Teasers */}
      <section className="py-20" style={{ backgroundColor: '#F8FAFD' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="border-l-4 border-[#0EA5E9] pl-6 mb-12">
            <h2 className="mb-2" style={{ color: '#071829' }}>Case Studies</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow" style={{ borderColor: '#E5E7EB' }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#071829' }}>EMS workforce forecasting & scheduling modernization</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#1E293B' }}>
                Built a staffing and call-volume prediction system with operational dashboards and measurable performance improvements.
              </p>
            </div>

            <div className="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow" style={{ borderColor: '#E5E7EB' }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#071829' }}>Hospital-EMS operational intelligence & decision support</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#1E293B' }}>
                Designed an analytics framework to support cross-agency operational decisions and long-term capability planning.
              </p>
            </div>

            <div className="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow" style={{ borderColor: '#E5E7EB' }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#071829' }}>Executive KPI system for operations leadership</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#1E293B' }}>
                Created a metrics architecture and Tableau experience that aligned teams and reduced reporting friction.
              </p>
            </div>
          </div>

          <div className="text-center">
            <a
              href="/portfolio"
              className="inline-block px-8 py-4 rounded-md border-2 font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{ borderColor: '#071829', color: '#071829', backgroundColor: 'transparent' }}
              onMouseEnter={(e) => { e.target.style.backgroundColor = '#071829'; e.target.style.color = '#FFFFFF'; }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = '#071829'; }}
            >
              View all case studies
            </a>
          </div>
        </div>
      </section>

      {/* Capabilities Quick Links */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="border-l-4 border-[#0EA5E9] pl-6 mb-12">
            <h2 className="mb-2" style={{ color: '#071829' }}>Capabilities</h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <a href="/capabilities" className="flex items-center p-4 rounded-lg border hover:shadow-md transition-all" style={{ borderColor: '#E5E7EB' }}>
              <span className="mr-3 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
              <span className="font-semibold" style={{ color: '#071829' }}>Predictive Analytics & Forecasting</span>
            </a>
            <a href="/capabilities" className="flex items-center p-4 rounded-lg border hover:shadow-md transition-all" style={{ borderColor: '#E5E7EB' }}>
              <span className="mr-3 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
              <span className="font-semibold" style={{ color: '#071829' }}>Machine Learning & Model Deployment</span>
            </a>
            <a href="/capabilities" className="flex items-center p-4 rounded-lg border hover:shadow-md transition-all" style={{ borderColor: '#E5E7EB' }}>
              <span className="mr-3 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
              <span className="font-semibold" style={{ color: '#071829' }}>Tableau Dashboards & TabPy Integration</span>
            </a>
            <a href="/capabilities" className="flex items-center p-4 rounded-lg border hover:shadow-md transition-all" style={{ borderColor: '#E5E7EB' }}>
              <span className="mr-3 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
              <span className="font-semibold" style={{ color: '#071829' }}>Data Engineering & Pipelines</span>
            </a>
            <a href="/capabilities" className="flex items-center p-4 rounded-lg border hover:shadow-md transition-all" style={{ borderColor: '#E5E7EB' }}>
              <span className="mr-3 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
              <span className="font-semibold" style={{ color: '#071829' }}>Automation & Decision Workflows</span>
            </a>
            <a href="/capabilities" className="flex items-center p-4 rounded-lg border hover:shadow-md transition-all" style={{ borderColor: '#E5E7EB' }}>
              <span className="mr-3 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
              <span className="font-semibold" style={{ color: '#071829' }}>Governance, Security & Compliance Support</span>
            </a>
          </div>
        </div>
      </section>

      {/* Subscribe Section - Calm & Minimal */}
      <section className="py-20" style={{ backgroundColor: '#F8FAFD' }}>
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold" style={{ color: '#071829' }}>Our insights. Your choices.</h2>
          <p className="text-lg mb-8" style={{ color: '#475569' }}>
            Practical analytics & AI guidance for public safety and operations.
          </p>
          <a
            href="/contact"
            className="inline-block px-10 py-5 rounded-md font-semibold shadow-lg transition-all duration-200 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{ backgroundColor: '#1D4ED8', color: '#FFFFFF' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#2563EB'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#1D4ED8'}
          >
            Subscribe
          </a>
        </div>
      </section>

      {/* Final Contact CTA */}
      <section id="contact" className="bg-white py-24">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="mb-4 text-4xl font-bold" style={{ color: '#071829' }}>Let us be part of your success story</h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: '#475569' }}>
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
