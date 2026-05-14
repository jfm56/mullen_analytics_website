'use client';

export default function TechnologyPage() {
  return (
    <div>
      {/* Hero Section - Full-width background image */}
      <section className="relative overflow-hidden" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center' }}>
        <div className="absolute inset-0" style={{ backgroundImage: 'url(/Technology%20%26%20Artificial%20Intelligence%20Hero%20.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.4)' }} />
        
        <div className="relative max-w-7xl mx-auto px-4 py-24">
          <div style={{ maxWidth: '600px' }}>
            <h1 className="mb-6 text-5xl font-bold" style={{ color: '#FFFFFF' }}>
              Technology & Artificial Intelligence
            </h1>
            <p className="text-xl mb-8" style={{ color: '#E5E7EB' }}>
              Applied, explainable systems for mission-critical decisions
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="/contact"
                className="px-8 py-4 rounded-md font-semibold shadow-xl transition-all duration-200 hover:shadow-2xl text-center"
                style={{ backgroundColor: '#1D4ED8', color: '#FFFFFF' }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = '#2563EB')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = '#1D4ED8')}
              >
                Request Briefing
              </a>
              <a
                href="https://calendar.app.google/4JuyKX7s75GmJT5u9"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 rounded-md border-2 font-semibold transition-all duration-200 text-center"
                style={{ borderColor: '#FFFFFF', color: '#FFFFFF', backgroundColor: 'transparent' }}
                onMouseEnter={(e) => { e.target.style.backgroundColor = '#FFFFFF'; e.target.style.color = '#071829'; }}
                onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = '#FFFFFF'; }}
              >
                Schedule Call
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Page Intro - Separated from hero */}
      <section className="py-20" style={{ backgroundColor: '#F8FAFD' }}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="h-px bg-[#0EA5E9] w-24 mx-auto mb-8" />
          <p className="text-xl leading-relaxed" style={{ color: '#1E293B', maxWidth: '680px', margin: '0 auto' }}>
            Technology is at the core of everything we deliver. Our analytics, machine learning, and AI solutions are built to support high-stakes decisions in healthcare, public safety, life sciences, and environmental systems.
          </p>
          <div className="h-px bg-[#0EA5E9] w-24 mx-auto mt-8" />
        </div>
      </section>

      {/* Artificial Intelligence - Image RIGHT */}
      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="mb-4" style={{ color: '#071829' }}>Artificial Intelligence</h2>
              <p className="text-lg leading-relaxed mb-8" style={{ color: '#1E293B' }}>
                We design and deploy AI systems that augment human decision-making in complex, regulated, and mission-critical environments.
              </p>
              
              <h3 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: '#1D4ED8' }}>AI Capabilities</h3>
              <div className="grid grid-cols-2 gap-3 mb-8">
                <div className="flex items-center px-4 py-3 rounded-md" style={{ backgroundColor: '#F8FAFD' }}>
                  <span className="mr-2 text-lg" style={{ color: '#0EA5E9' }}>✓</span>
                  <span className="text-sm font-medium" style={{ color: '#1E293B' }}>Predictive Modeling</span>
                </div>
                <div className="flex items-center px-4 py-3 rounded-md" style={{ backgroundColor: '#F8FAFD' }}>
                  <span className="mr-2 text-lg" style={{ color: '#0EA5E9' }}>✓</span>
                  <span className="text-sm font-medium" style={{ color: '#1E293B' }}>Machine Learning</span>
                </div>
                <div className="flex items-center px-4 py-3 rounded-md" style={{ backgroundColor: '#F8FAFD' }}>
                  <span className="mr-2 text-lg" style={{ color: '#0EA5E9' }}>✓</span>
                  <span className="text-sm font-medium" style={{ color: '#1E293B' }}>Time-Series Analysis</span>
                </div>
                <div className="flex items-center px-4 py-3 rounded-md" style={{ backgroundColor: '#F8FAFD' }}>
                  <span className="mr-2 text-lg" style={{ color: '#0EA5E9' }}>✓</span>
                  <span className="text-sm font-medium" style={{ color: '#1E293B' }}>Risk Classification</span>
                </div>
              </div>
              
              <h3 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: '#1D4ED8' }}>Applied Domains</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center px-4 py-3 rounded-md" style={{ backgroundColor: '#F8FAFD' }}>
                  <span className="mr-2 text-lg" style={{ color: '#0EA5E9' }}>✓</span>
                  <span className="text-sm font-medium" style={{ color: '#1E293B' }}>Healthcare</span>
                </div>
                <div className="flex items-center px-4 py-3 rounded-md" style={{ backgroundColor: '#F8FAFD' }}>
                  <span className="mr-2 text-lg" style={{ color: '#0EA5E9' }}>✓</span>
                  <span className="text-sm font-medium" style={{ color: '#1E293B' }}>Public Safety</span>
                </div>
                <div className="flex items-center px-4 py-3 rounded-md" style={{ backgroundColor: '#F8FAFD' }}>
                  <span className="mr-2 text-lg" style={{ color: '#0EA5E9' }}>✓</span>
                  <span className="text-sm font-medium" style={{ color: '#1E293B' }}>Life Sciences</span>
                </div>
                <div className="flex items-center px-4 py-3 rounded-md" style={{ backgroundColor: '#F8FAFD' }}>
                  <span className="mr-2 text-lg" style={{ color: '#0EA5E9' }}>✓</span>
                  <span className="text-sm font-medium" style={{ color: '#1E293B' }}>Environmental</span>
                </div>
              </div>
            </div>
            <div className="rounded-lg overflow-hidden shadow-lg">
              <img src="/Artificial%20Intelligence%20(Applied%20AI%20section).jpg" alt="Artificial Intelligence" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Responsible & Applied AI - Trust Block */}
      <section className="py-20" style={{ backgroundColor: '#071829' }}>
        <div className="max-w-5xl mx-auto px-4">
          <div className="mb-12 rounded-lg overflow-hidden shadow-xl">
            <img src="/Responsible%20%26%20Applied%20AI.png" alt="Responsible & Applied AI" className="w-full h-auto object-cover" style={{ maxHeight: '300px' }} />
          </div>
          <div className="text-center mb-12">
            <h2 className="mb-4" style={{ color: '#FFFFFF' }}>Responsible & Applied AI</h2>
            <p className="text-xl max-w-2xl mx-auto" style={{ color: '#E5E7EB' }}>
              AI systems must be trusted to be effective. We prioritize transparency, explainability, and governance.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/10 backdrop-blur rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all">
              <div className="text-3xl mb-3">✓</div>
              <h3 className="text-lg font-bold mb-2" style={{ color: '#FFFFFF' }}>Explainability</h3>
              <p className="text-sm" style={{ color: '#E5E7EB' }}>Transparent model design</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all">
              <div className="text-3xl mb-3">✓</div>
              <h3 className="text-lg font-bold mb-2" style={{ color: '#FFFFFF' }}>Governance</h3>
              <p className="text-sm" style={{ color: '#E5E7EB' }}>Model documentation & controls</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all">
              <div className="text-3xl mb-3">✓</div>
              <h3 className="text-lg font-bold mb-2" style={{ color: '#FFFFFF' }}>Human-in-the-loop</h3>
              <p className="text-sm" style={{ color: '#E5E7EB' }}>Augmented decision-making</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all">
              <div className="text-3xl mb-3">✓</div>
              <h3 className="text-lg font-bold mb-2" style={{ color: '#FFFFFF' }}>Regulated Deployment</h3>
              <p className="text-sm" style={{ color: '#E5E7EB' }}>Compliance-ready systems</p>
            </div>
          </div>
        </div>
      </section>

      {/* Delivery Platforms - Image LEFT */}
      <section className="py-20" style={{ backgroundColor: '#F8FAFD' }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="rounded-lg overflow-hidden shadow-lg">
              <img src="/Delivery%20Platforms.png" alt="Delivery Platforms" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="mb-4" style={{ color: '#071829' }}>Delivery Platforms</h2>
              <p className="text-lg leading-relaxed mb-6" style={{ color: '#1E293B' }}>
                Secure platforms designed to ingest data, train models, and surface insights through dashboards and decision-support tools.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center px-4 py-3 rounded-md bg-white">
                  <span className="mr-2 text-lg" style={{ color: '#0EA5E9' }}>✓</span>
                  <span className="text-sm font-medium" style={{ color: '#1E293B' }}>Data Pipelines</span>
                </div>
                <div className="flex items-center px-4 py-3 rounded-md bg-white">
                  <span className="mr-2 text-lg" style={{ color: '#0EA5E9' }}>✓</span>
                  <span className="text-sm font-medium" style={{ color: '#1E293B' }}>Model Deployment</span>
                </div>
                <div className="flex items-center px-4 py-3 rounded-md bg-white">
                  <span className="mr-2 text-lg" style={{ color: '#0EA5E9' }}>✓</span>
                  <span className="text-sm font-medium" style={{ color: '#1E293B' }}>Monitoring</span>
                </div>
                <div className="flex items-center px-4 py-3 rounded-md bg-white">
                  <span className="mr-2 text-lg" style={{ color: '#0EA5E9' }}>✓</span>
                  <span className="text-sm font-medium" style={{ color: '#1E293B' }}>Client Outputs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Emerging Technology - Card-style section */}
      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="mb-12 rounded-lg overflow-hidden shadow-xl">
            <img src="/Emerging%20Technology.jpeg" alt="Emerging Technology" className="w-full h-auto object-cover" style={{ maxHeight: '400px' }} />
          </div>
          <div className="text-center mb-12">
            <h2 className="mb-4" style={{ color: '#071829' }}>Emerging Technology</h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: '#1E293B' }}>
              We evaluate and apply new technologies selectively — prioritizing practical value over experimentation.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-6 border-2 hover:shadow-lg transition-all" style={{ borderColor: '#0EA5E9' }}>
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#071829' }}>Advanced ML Architectures</h3>
              <p className="text-sm" style={{ color: '#475569' }}>Next-generation modeling techniques</p>
            </div>
            <div className="bg-white rounded-lg p-6 border-2 hover:shadow-lg transition-all" style={{ borderColor: '#0EA5E9' }}>
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#071829' }}>Geospatial Analytics</h3>
              <p className="text-sm" style={{ color: '#475569' }}>Environmental and spatial intelligence</p>
            </div>
            <div className="bg-white rounded-lg p-6 border-2 hover:shadow-lg transition-all" style={{ borderColor: '#0EA5E9' }}>
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#071829' }}>AI-Assisted Decision Systems</h3>
              <p className="text-sm" style={{ color: '#475569' }}>Augmented operational intelligence</p>
            </div>
            <div className="bg-white rounded-lg p-6 border-2 hover:shadow-lg transition-all" style={{ borderColor: '#0EA5E9' }}>
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#071829' }}>Intelligent Workflows</h3>
              <p className="text-sm" style={{ color: '#475569' }}>Automation and process optimization</p>
            </div>
          </div>
        </div>
      </section>

      {/* Technology & Transformation - Text-focused, Image RIGHT */}
      <section className="py-20" style={{ backgroundColor: '#F8FAFD' }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="mb-4" style={{ color: '#071829' }}>Technology & Transformation</h2>
              <p className="text-lg leading-relaxed mb-6" style={{ color: '#1E293B' }}>
                Technology alone does not create impact. We help organizations align analytics and AI with strategy, operations, and governance.
              </p>
              <div className="space-y-4">
                <div className="flex items-start">
                  <span className="mr-3 text-lg" style={{ color: '#0EA5E9' }}>✓</span>
                  <span className="font-medium" style={{ color: '#1E293B' }}>Strategy alignment</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 text-lg" style={{ color: '#0EA5E9' }}>✓</span>
                  <span className="font-medium" style={{ color: '#1E293B' }}>Operational integration</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 text-lg" style={{ color: '#0EA5E9' }}>✓</span>
                  <span className="font-medium" style={{ color: '#1E293B' }}>Change enablement</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 text-lg" style={{ color: '#0EA5E9' }}>✓</span>
                  <span className="font-medium" style={{ color: '#1E293B' }}>Impact measurement</span>
                </div>
              </div>
            </div>
            <div className="rounded-lg overflow-hidden shadow-lg">
              <img src="/Technology%20%26%20Transformation.png" alt="Technology & Transformation" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Products & Accelerators - 4-card grid */}
      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="mb-12 rounded-lg overflow-hidden shadow-xl">
            <img src="/Analytics%20Products%20%26%20Accelerators.webp" alt="Analytics Products & Accelerators" className="w-full h-auto object-cover" style={{ maxHeight: '300px' }} />
          </div>
          <div className="text-center mb-12">
            <h2 className="mb-4" style={{ color: '#071829' }}>Analytics Products & Accelerators</h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: '#1E293B' }}>
              Targeted analytics accelerators designed to solve recurring problems in public safety, healthcare, and environmental systems.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-lg border-t-4" style={{ borderColor: '#0EA5E9' }}>
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#071829' }}>Staffing Forecasts</h3>
              <p className="text-sm" style={{ color: '#475569' }}>Demand and workforce planning</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-lg border-t-4" style={{ borderColor: '#0EA5E9' }}>
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#071829' }}>Risk Scoring</h3>
              <p className="text-sm" style={{ color: '#475569' }}>Classification and prioritization</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-lg border-t-4" style={{ borderColor: '#0EA5E9' }}>
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#071829' }}>Ops Dashboards</h3>
              <p className="text-sm" style={{ color: '#475569' }}>Performance and KPI tracking</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-lg border-t-4" style={{ borderColor: '#0EA5E9' }}>
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#071829' }}>Environmental Tools</h3>
              <p className="text-sm" style={{ color: '#475569' }}>Risk and planning systems</p>
            </div>
          </div>
        </div>
      </section>

      {/* Tech-Enabled Services - Image RIGHT */}
      <section className="py-20" style={{ backgroundColor: '#F8FAFD' }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="mb-4" style={{ color: '#071829' }}>Tech-Enabled Services</h2>
              <p className="text-lg leading-relaxed mb-6" style={{ color: '#1E293B' }}>
                Maintain, evolve, and govern analytics systems over time — without building internal teams from scratch.
              </p>
              <div className="space-y-4">
                <div className="flex items-start">
                  <span className="mr-3 text-lg" style={{ color: '#0EA5E9' }}>✓</span>
                  <span className="font-medium" style={{ color: '#1E293B' }}>Monitoring & updates</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 text-lg" style={{ color: '#0EA5E9' }}>✓</span>
                  <span className="font-medium" style={{ color: '#1E293B' }}>Maintenance & enhancements</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 text-lg" style={{ color: '#0EA5E9' }}>✓</span>
                  <span className="font-medium" style={{ color: '#1E293B' }}>Pipeline support</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 text-lg" style={{ color: '#0EA5E9' }}>✓</span>
                  <span className="font-medium" style={{ color: '#1E293B' }}>Advisory services</span>
                </div>
              </div>
            </div>
            <div className="rounded-lg overflow-hidden shadow-lg">
              <img src="/Tech-Enabled%20Services.webp" alt="Tech-Enabled Services" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA - Dark Background */}
      <section className="py-24" style={{ backgroundColor: '#071829' }}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="mb-6 text-4xl font-bold" style={{ color: '#FFFFFF' }}>Ready to apply AI with confidence?</h2>
          <div className="flex flex-col sm:flex-row justify-center gap-6 mt-12">
            <a
              href="/contact"
              className="px-12 py-6 rounded-md font-semibold text-lg shadow-xl transition-all duration-200 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-offset-2 text-center"
              style={{ backgroundColor: '#1D4ED8', color: '#FFFFFF' }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = '#2563EB')}
              onMouseLeave={(e) => (e.target.style.backgroundColor = '#1D4ED8')}
            >
              Request Briefing
            </a>
            <a
              href="https://calendar.app.google/4JuyKX7s75GmJT5u9"
              target="_blank"
              rel="noopener noreferrer"
              className="px-12 py-6 rounded-md border-2 font-semibold text-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 text-center"
              style={{ borderColor: '#FFFFFF', color: '#FFFFFF', backgroundColor: 'transparent' }}
              onMouseEnter={(e) => { e.target.style.backgroundColor = '#FFFFFF'; e.target.style.color = '#071829'; }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = '#FFFFFF'; }}
            >
              Schedule
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
