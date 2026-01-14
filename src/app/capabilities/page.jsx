'use client';

export default function CapabilitiesPage() {
  return (
    <div>
      {/* Hero Section - Enterprise Navy with Accent Bar */}
      <section className="relative overflow-hidden" style={{ backgroundColor: '#0B3C5D' }}>
        <div className="absolute inset-0" style={{ backgroundImage: 'url(/Turning%20Complex%20Data%20Into%20Defensible%20Decisions.webp)', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.3)' }} />
        
        <div className="relative max-w-7xl mx-auto px-4 py-24 md:py-32">
          <div className="max-w-4xl">
            <div className="border-l-4 border-[#5FB3A2] pl-6 mb-8">
              <h1 className="mb-6" style={{ color: '#FFB88C' }}>
                Turning Complex Data Into Defensible Decisions
              </h1>
            </div>
            <div className="h-px bg-[#5FB3A2] w-24 mb-8" />
            <p className="text-xl text-gray-200 leading-relaxed mb-6 max-w-3xl">
              Mullen Analytics & AI Consulting partners with public agencies, healthcare organizations, and research-driven institutions to design, deploy, and operationalize advanced analytics and artificial intelligence in high-stakes, regulated, and mission-critical environments.
            </p>
            <p className="text-lg text-gray-300 leading-relaxed max-w-3xl mb-8">
              We specialize in decision-focused analytics—from predictive modeling and machine learning to secure data pipelines and executive dashboards—delivering solutions that support accountability, transparency, and real-world operational outcomes, not just technical performance.
            </p>
            <p className="text-sm text-gray-400 mb-10 max-w-3xl">
              Supporting mission-critical decisions across public safety, healthcare, and research
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="/contact"
                className="px-8 py-4 rounded-md font-semibold shadow-lg transition-all duration-200 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#0B3C5D] text-center"
                style={{ backgroundColor: '#FFFFFF', color: '#0B3C5D' }}
              >
                Request a capabilities briefing
              </a>
              <a
                href="https://calendar.app.google/4JuyKX7s75GmJT5u9"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 rounded-md border-2 font-semibold transition-all duration-200 hover:bg-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#0B3C5D] text-center"
                style={{ borderColor: '#FFFFFF', color: '#FFFFFF' }}
                onMouseEnter={(e) => { e.target.style.backgroundColor = '#FFFFFF'; e.target.style.color = '#0B3C5D'; }}
                onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = '#FFFFFF'; }}
              >
                Schedule a strategy consultation
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Overview - Separated Section */}
      <section className="py-20" style={{ backgroundColor: '#F7F9FC' }}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="h-px bg-[#5FB3A2] w-24 mx-auto mb-8" />
          <h2 className="mb-6" style={{ color: '#0B3C5D' }}>Capabilities</h2>
          <p className="text-xl leading-relaxed max-w-2xl mx-auto" style={{ color: '#1F2933' }}>
            Our capabilities span strategy, analytics, and technology delivery, purpose-built for organizations operating in complex, regulated, and mission-critical environments.
          </p>
          <div className="h-px bg-[#5FB3A2] w-24 mx-auto mt-8" />
        </div>
      </section>

      {/* Decision Intelligence - Image LEFT */}
      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="rounded-lg overflow-hidden shadow-lg">
              <img src="/Decision Intelligence & Analytics Strategy.webp" alt="Decision Intelligence & Analytics Strategy" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="mb-4" style={{ color: '#0B3C5D' }}>Decision Intelligence & Analytics Strategy</h2>
              <p className="text-lg leading-relaxed mb-6" style={{ color: '#1F2933' }}>
                We help leadership teams translate complex data into actionable, defensible decisions aligned with organizational goals and operational realities.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center px-4 py-3 rounded-md" style={{ backgroundColor: '#F7F9FC' }}>
                  <span className="mr-2 text-lg" style={{ color: '#5FB3A2' }}>✓</span>
                  <span className="text-sm font-medium" style={{ color: '#1F2933' }}>Analytics Strategy</span>
                </div>
                <div className="flex items-center px-4 py-3 rounded-md" style={{ backgroundColor: '#F7F9FC' }}>
                  <span className="mr-2 text-lg" style={{ color: '#5FB3A2' }}>✓</span>
                  <span className="text-sm font-medium" style={{ color: '#1F2933' }}>KPI Design</span>
                </div>
                <div className="flex items-center px-4 py-3 rounded-md" style={{ backgroundColor: '#F7F9FC' }}>
                  <span className="mr-2 text-lg" style={{ color: '#5FB3A2' }}>✓</span>
                  <span className="text-sm font-medium" style={{ color: '#1F2933' }}>Use-Case Analysis</span>
                </div>
                <div className="flex items-center px-4 py-3 rounded-md" style={{ backgroundColor: '#F7F9FC' }}>
                  <span className="mr-2 text-lg" style={{ color: '#5FB3A2' }}>✓</span>
                  <span className="text-sm font-medium" style={{ color: '#1F2933' }}>Model Governance</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Public Safety - Image RIGHT */}
      <section className="py-20" style={{ backgroundColor: '#F7F9FC' }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="mb-4" style={{ color: '#0B3C5D' }}>Public Safety & Emergency Services Analytics</h2>
              <p className="text-lg leading-relaxed mb-6" style={{ color: '#1F2933' }}>
                Built on direct operational experience, our analytics reflect the realities of emergency response—not theoretical models.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center px-4 py-3 rounded-md bg-white">
                  <span className="mr-2 text-lg" style={{ color: '#5FB3A2' }}>✓</span>
                  <span className="text-sm font-medium" style={{ color: '#1F2933' }}>Demand Forecasting</span>
                </div>
                <div className="flex items-center px-4 py-3 rounded-md bg-white">
                  <span className="mr-2 text-lg" style={{ color: '#5FB3A2' }}>✓</span>
                  <span className="text-sm font-medium" style={{ color: '#1F2933' }}>Staffing Optimization</span>
                </div>
                <div className="flex items-center px-4 py-3 rounded-md bg-white">
                  <span className="mr-2 text-lg" style={{ color: '#5FB3A2' }}>✓</span>
                  <span className="text-sm font-medium" style={{ color: '#1F2933' }}>Response Analysis</span>
                </div>
                <div className="flex items-center px-4 py-3 rounded-md bg-white">
                  <span className="mr-2 text-lg" style={{ color: '#5FB3A2' }}>✓</span>
                  <span className="text-sm font-medium" style={{ color: '#1F2933' }}>Risk Modeling</span>
                </div>
              </div>
            </div>
            <div className="rounded-lg overflow-hidden shadow-lg">
              <img src="/Public%20Safety%20%26%20Emergency%20Services%20Analytics.jpeg" alt="Public Safety Analytics" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Healthcare - Image LEFT */}
      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="rounded-lg overflow-hidden shadow-lg">
              <img src="/Healthcare%20%26%20Biomedical%20Intelligence.jpg" alt="Healthcare & Biomedical Intelligence" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="mb-4" style={{ color: '#0B3C5D' }}>Healthcare & Biomedical Intelligence</h2>
              <p className="text-lg leading-relaxed mb-6" style={{ color: '#1F2933' }}>
                Analytics designed for accuracy, accountability, and explainability in healthcare environments where trust and compliance are critical.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center px-4 py-3 rounded-md" style={{ backgroundColor: '#F7F9FC' }}>
                  <span className="mr-2 text-lg" style={{ color: '#5FB3A2' }}>✓</span>
                  <span className="text-sm font-medium" style={{ color: '#1F2933' }}>Clinical Modeling</span>
                </div>
                <div className="flex items-center px-4 py-3 rounded-md" style={{ backgroundColor: '#F7F9FC' }}>
                  <span className="mr-2 text-lg" style={{ color: '#5FB3A2' }}>✓</span>
                  <span className="text-sm font-medium" style={{ color: '#1F2933' }}>Risk Stratification</span>
                </div>
                <div className="flex items-center px-4 py-3 rounded-md" style={{ backgroundColor: '#F7F9FC' }}>
                  <span className="mr-2 text-lg" style={{ color: '#5FB3A2' }}>✓</span>
                  <span className="text-sm font-medium" style={{ color: '#1F2933' }}>Data Integration</span>
                </div>
                <div className="flex items-center px-4 py-3 rounded-md" style={{ backgroundColor: '#F7F9FC' }}>
                  <span className="mr-2 text-lg" style={{ color: '#5FB3A2' }}>✓</span>
                  <span className="text-sm font-medium" style={{ color: '#1F2933' }}>Explainable AI</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Biology - Image RIGHT */}
      <section className="py-20" style={{ backgroundColor: '#F7F9FC' }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="mb-4" style={{ color: '#0B3C5D' }}>Biology, Life Sciences & Research Analytics</h2>
              <p className="text-lg leading-relaxed mb-6" style={{ color: '#1F2933' }}>
                We support research-driven organizations by applying advanced analytics to complex biological data, bridging research and production.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center px-4 py-3 rounded-md bg-white">
                  <span className="mr-2 text-lg" style={{ color: '#5FB3A2' }}>✓</span>
                  <span className="text-sm font-medium" style={{ color: '#1F2933' }}>Biological Modeling</span>
                </div>
                <div className="flex items-center px-4 py-3 rounded-md bg-white">
                  <span className="mr-2 text-lg" style={{ color: '#5FB3A2' }}>✓</span>
                  <span className="text-sm font-medium" style={{ color: '#1F2933' }}>Omics Analysis</span>
                </div>
                <div className="flex items-center px-4 py-3 rounded-md bg-white">
                  <span className="mr-2 text-lg" style={{ color: '#5FB3A2' }}>✓</span>
                  <span className="text-sm font-medium" style={{ color: '#1F2933' }}>Feature Engineering</span>
                </div>
                <div className="flex items-center px-4 py-3 rounded-md bg-white">
                  <span className="mr-2 text-lg" style={{ color: '#5FB3A2' }}>✓</span>
                  <span className="text-sm font-medium" style={{ color: '#1F2933' }}>Research Pipelines</span>
                </div>
              </div>
            </div>
            <div className="rounded-lg overflow-hidden shadow-lg">
              <img src="/Biology, Life Sciences & Research Analytics.jpg" alt="Biology, Life Sciences & Research Analytics" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Environmental - Image LEFT */}
      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="rounded-lg overflow-hidden shadow-lg">
              <img src="/Environmental, Ecological & Geospatial Analytics.png" alt="Environmental, Ecological & Geospatial Analytics" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="mb-4" style={{ color: '#0B3C5D' }}>Environmental, Ecological & Geospatial Analytics</h2>
              <p className="text-lg leading-relaxed mb-6" style={{ color: '#1F2933' }}>
                Advanced analytics for environmentally sensitive regions, with expertise in ecology, land-use, and wildfire risk modeling.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center px-4 py-3 rounded-md" style={{ backgroundColor: '#F7F9FC' }}>
                  <span className="mr-2 text-lg" style={{ color: '#5FB3A2' }}>✓</span>
                  <span className="text-sm font-medium" style={{ color: '#1F2933' }}>Ecological Modeling</span>
                </div>
                <div className="flex items-center px-4 py-3 rounded-md" style={{ backgroundColor: '#F7F9FC' }}>
                  <span className="mr-2 text-lg" style={{ color: '#5FB3A2' }}>✓</span>
                  <span className="text-sm font-medium" style={{ color: '#1F2933' }}>Wildfire Risk</span>
                </div>
                <div className="flex items-center px-4 py-3 rounded-md" style={{ backgroundColor: '#F7F9FC' }}>
                  <span className="mr-2 text-lg" style={{ color: '#5FB3A2' }}>✓</span>
                  <span className="text-sm font-medium" style={{ color: '#1F2933' }}>Geospatial Analytics</span>
                </div>
                <div className="flex items-center px-4 py-3 rounded-md" style={{ backgroundColor: '#F7F9FC' }}>
                  <span className="mr-2 text-lg" style={{ color: '#5FB3A2' }}>✓</span>
                  <span className="text-sm font-medium" style={{ color: '#1F2933' }}>Climate Analysis</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Analytics Platforms - Image RIGHT */}
      <section className="py-20" style={{ backgroundColor: '#F7F9FC' }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="mb-4" style={{ color: '#0B3C5D' }}>Analytics Platforms, AI & Technology Delivery</h2>
              <p className="text-lg leading-relaxed mb-6" style={{ color: '#1F2933' }}>
                We design and deploy secure, scalable, production-ready analytics systems that integrate seamlessly into existing operations.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center px-4 py-3 rounded-md bg-white">
                  <span className="mr-2 text-lg" style={{ color: '#5FB3A2' }}>✓</span>
                  <span className="text-sm font-medium" style={{ color: '#1F2933' }}>Machine Learning</span>
                </div>
                <div className="flex items-center px-4 py-3 rounded-md bg-white">
                  <span className="mr-2 text-lg" style={{ color: '#5FB3A2' }}>✓</span>
                  <span className="text-sm font-medium" style={{ color: '#1F2933' }}>Data Engineering</span>
                </div>
                <div className="flex items-center px-4 py-3 rounded-md bg-white">
                  <span className="mr-2 text-lg" style={{ color: '#5FB3A2' }}>✓</span>
                  <span className="text-sm font-medium" style={{ color: '#1F2933' }}>Dashboards & Viz</span>
                </div>
                <div className="flex items-center px-4 py-3 rounded-md bg-white">
                  <span className="mr-2 text-lg" style={{ color: '#5FB3A2' }}>✓</span>
                  <span className="text-sm font-medium" style={{ color: '#1F2933' }}>Secure Systems</span>
                </div>
              </div>
            </div>
            <div className="rounded-lg overflow-hidden shadow-lg">
              <img src="/Analytics Platforms, AI & Technology Delivery.jpg" alt="Analytics Platforms, AI & Technology Delivery" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Procurement - Credibility Block */}
      <section className="py-20" style={{ backgroundColor: '#0B3C5D' }}>
        <div className="max-w-5xl mx-auto px-4">
          <div className="mb-12 rounded-lg overflow-hidden shadow-xl">
            <img src="/Procurement%20%26%20Contracting%20Alignment.jpg" alt="Procurement & Contracting Alignment" className="w-full h-auto object-cover" />
          </div>
          <div className="text-center mb-12">
            <h2 className="mb-4" style={{ color: '#FFFFFF' }}>Procurement & Contracting Alignment</h2>
            <p className="text-xl max-w-2xl mx-auto" style={{ color: '#E5E7EB' }}>
              Experienced in supporting public-sector procurement, RFP-based engagements, and multi-year contracts.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all">
              <div className="text-3xl mb-3">🛡️</div>
              <h3 className="text-xl font-bold mb-3" style={{ color: '#FFFFFF' }}>Security & Compliance</h3>
              <p className="text-sm" style={{ color: '#E5E7EB' }}>Information security and data protection standards</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all">
              <div className="text-3xl mb-3">📋</div>
              <h3 className="text-xl font-bold mb-3" style={{ color: '#FFFFFF' }}>Explainable AI</h3>
              <p className="text-sm" style={{ color: '#E5E7EB' }}>Auditable analytics models with clear documentation</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="text-xl font-bold mb-3" style={{ color: '#FFFFFF' }}>Oversight Ready</h3>
              <p className="text-sm" style={{ color: '#E5E7EB' }}>Documentation suitable for compliance and review</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all">
              <div className="text-3xl mb-3">🔒</div>
              <h3 className="text-xl font-bold mb-3" style={{ color: '#FFFFFF' }}>Secure Data Handling</h3>
              <p className="text-sm" style={{ color: '#E5E7EB' }}>Secure handling of sensitive and regulated data</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all">
              <div className="text-3xl mb-3">📈</div>
              <h3 className="text-xl font-bold mb-3" style={{ color: '#FFFFFF' }}>Scalable Solutions</h3>
              <p className="text-sm" style={{ color: '#E5E7EB' }}>Built to support long-term operations</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="text-xl font-bold mb-3" style={{ color: '#FFFFFF' }}>Flexible Engagement</h3>
              <p className="text-sm" style={{ color: '#E5E7EB' }}>Pilots, phased rollouts, or multi-year programs</p>
            </div>
          </div>
        </div>
      </section>

      {/* Engagement Models - White Background */}
      <section className="bg-white py-16">
        <div className="max-w-5xl mx-auto px-4">
          <div className="rounded-lg border overflow-hidden shadow-sm mb-8" style={{ backgroundColor: '#F7F9FC', borderColor: '#E5E7EB' }}>
            <div className="aspect-[16/9] bg-gray-200 overflow-hidden">
              <img src="/Engagement Models.jpg" alt="Engagement Models" className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="border-l-4 border-[#5FB3A2] pl-6 mb-8">
            <h2 className="mb-4" style={{ color: '#0B3C5D' }}>Engagement Models</h2>
            <p className="text-lg leading-relaxed mb-6 max-w-3xl" style={{ color: '#1F2933' }}>
              Our work is structured to meet organizations where they are—whether validating a single use case or deploying enterprise-level analytics programs.
            </p>
          </div>
          <p className="text-lg leading-relaxed mb-6 max-w-3xl" style={{ color: '#1F2933' }}>
            Typical engagements include:
          </p>
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-4 mb-8">
            <div className="flex items-start">
              <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
              <span style={{ color: '#1F2933' }}>Targeted analytics pilots and feasibility studies</span>
            </div>
            <div className="flex items-start">
              <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
              <span style={{ color: '#1F2933' }}>Production model and dashboard development</span>
            </div>
            <div className="flex items-start">
              <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
              <span style={{ color: '#1F2933' }}>Multi-phase analytics programs</span>
            </div>
            <div className="flex items-start">
              <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
              <span style={{ color: '#1F2933' }}>Ongoing analytics, model maintenance, and support</span>
            </div>
          </div>
          <p className="text-lg leading-relaxed max-w-3xl" style={{ color: '#1F2933' }}>
            Engagements are scoped based on complexity, data maturity, and operational impact, with pricing aligned to the value and risk profile of the work.
          </p>
        </div>
      </section>

      {/* Why Mullen Analytics - Value Grid */}
      <section className="py-24" style={{ backgroundColor: '#F7F9FC' }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="mb-4" style={{ color: '#0B3C5D' }}>Why Mullen Analytics</h2>
            <div className="h-px bg-[#5FB3A2] w-24 mx-auto" />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg p-8 shadow-lg border-t-4" style={{ borderColor: '#5FB3A2' }}>
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: '#0B3C5D' }}>Domain Expertise</h3>
              <p style={{ color: '#4B5563' }}>Deep knowledge across public safety, healthcare, biology, and environmental analytics</p>
            </div>
            <div className="bg-white rounded-lg p-8 shadow-lg border-t-4" style={{ borderColor: '#5FB3A2' }}>
              <div className="text-4xl mb-4">⚙️</div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: '#0B3C5D' }}>Operational Focus</h3>
              <p style={{ color: '#4B5563' }}>Solutions designed for real operational decisions, not academic demonstrations</p>
            </div>
            <div className="bg-white rounded-lg p-8 shadow-lg border-t-4" style={{ borderColor: '#5FB3A2' }}>
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: '#0B3C5D' }}>Explainable AI</h3>
              <p style={{ color: '#4B5563' }}>Defensible models suitable for regulated and public environments</p>
            </div>
            <div className="bg-white rounded-lg p-8 shadow-lg border-t-4" style={{ borderColor: '#5FB3A2' }}>
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: '#0B3C5D' }}>Secure Systems</h3>
              <p style={{ color: '#4B5563' }}>Production-ready systems built to deploy, scale, and endure</p>
            </div>
            <div className="bg-white rounded-lg p-8 shadow-lg border-t-4" style={{ borderColor: '#5FB3A2' }}>
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: '#0B3C5D' }}>Leadership Access</h3>
              <p style={{ color: '#4B5563' }}>Direct engagement with senior leadership and operational stakeholders</p>
            </div>
            <div className="bg-white rounded-lg p-8 shadow-lg border-t-4" style={{ borderColor: '#5FB3A2' }}>
              <div className="text-4xl mb-4">📈</div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: '#0B3C5D' }}>Long-term Support</h3>
              <p style={{ color: '#4B5563' }}>Committed partnerships that extend beyond initial deployment</p>
            </div>
          </div>
        </div>
      </section>

      {/* Explore Further - Light Gray Background */}
      <section className="py-12" style={{ backgroundColor: '#F7F9FC' }}>
        <div className="max-w-5xl mx-auto px-4">
          <h3 className="text-lg font-semibold mb-6" style={{ color: '#0B3C5D' }}>Explore Further</h3>
          <div className="flex flex-wrap gap-6">
            <a href="/portfolio" className="transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2" style={{ color: '#2E6F95' }} onMouseEnter={(e) => e.target.style.color = '#0B3C5D'} onMouseLeave={(e) => e.target.style.color = '#2E6F95'}>Case studies</a>
            <a href="/industries" className="transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2" style={{ color: '#2E6F95' }} onMouseEnter={(e) => e.target.style.color = '#0B3C5D'} onMouseLeave={(e) => e.target.style.color = '#2E6F95'}>Industry applications</a>
            <a href="/about" className="transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2" style={{ color: '#2E6F95' }} onMouseEnter={(e) => e.target.style.color = '#0B3C5D'} onMouseLeave={(e) => e.target.style.color = '#2E6F95'}>Technical approach</a>
          </div>
        </div>
      </section>

      {/* Final CTA - Dark Background */}
      <section className="py-24" style={{ backgroundColor: '#0B3C5D' }}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="mb-6 text-4xl font-bold" style={{ color: '#FFFFFF' }}>Ready to move forward?</h2>
          <div className="flex flex-col sm:flex-row justify-center gap-6 mt-12">
            <a
              href="/contact"
              className="px-12 py-6 rounded-md font-semibold text-lg shadow-xl transition-all duration-200 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-offset-2 text-center"
              style={{ backgroundColor: '#5FB3A2', color: '#0B3C5D' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#FFFFFF'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#5FB3A2'}
            >
              Request Briefing
            </a>
            <a
              href="https://calendar.app.google/4JuyKX7s75GmJT5u9"
              target="_blank"
              rel="noopener noreferrer"
              className="px-12 py-6 rounded-md border-2 font-semibold text-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 text-center"
              style={{ borderColor: '#FFFFFF', color: '#FFFFFF', backgroundColor: 'transparent' }}
              onMouseEnter={(e) => { e.target.style.backgroundColor = '#FFFFFF'; e.target.style.color = '#0B3C5D'; }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = '#FFFFFF'; }}
            >
              Schedule a strategy consultation
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
