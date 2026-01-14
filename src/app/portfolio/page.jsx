'use client';

export default function PortfolioPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden" style={{ backgroundColor: '#0B3C5D' }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url(/particle-wave.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        
        <div className="relative max-w-7xl mx-auto px-4 py-24 md:py-32">
          <div className="max-w-4xl">
            <div className="border-l-4 border-[#5FB3A2] pl-6 mb-8">
              <h1 className="mb-6" style={{ color: '#FFB88C' }}>
                Portfolio & Case Studies
              </h1>
            </div>
            <div className="h-px bg-[#5FB3A2] w-24 mb-8" />
            <p className="text-xl text-gray-200 leading-relaxed max-w-3xl">
              Selected examples of completed analytics, machine learning, and software projects demonstrating production-ready thinking, disciplined engineering practices, and decision-focused design.
            </p>
          </div>
        </div>
      </section>

      {/* EMS Demand & Operational Analytics */}
      <section className="bg-white py-16">
        <div className="max-w-5xl mx-auto px-4">
          <div className="border-l-4 border-[#2E6F95] pl-6 mb-8">
            <h2 className="mb-4" style={{ color: '#0B3C5D' }}>EMS Demand & Operational Analytics</h2>
          </div>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#2E6F95' }}>Challenge</h3>
              <p className="text-base leading-relaxed" style={{ color: '#1F2933' }}>
                Emergency services operate under fluctuating demand patterns that make staffing and coverage decisions difficult without data-driven insight.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#2E6F95' }}>Approach</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                  <span style={{ color: '#1F2933' }}>Analyzed EMS call and operational data to identify demand patterns and workload drivers</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                  <span style={{ color: '#1F2933' }}>Applied statistical and predictive modeling techniques to understand trends over time</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                  <span style={{ color: '#1F2933' }}>Structured analytical outputs to support operational decision-making rather than academic experimentation</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#2E6F95' }}>Outcome</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                  <span style={{ color: '#1F2933' }}>Improved visibility into EMS call behavior and operational drivers</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                  <span style={{ color: '#1F2933' }}>Established a reusable analytical framework for future forecasting and staffing studies</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                  <span style={{ color: '#1F2933' }}>Demonstrated how data science can support real-world public safety decisions</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
              <p className="text-sm font-semibold" style={{ color: '#2E6F95' }}>
                Capabilities demonstrated: <span className="font-normal" style={{ color: '#1F2933' }}>Predictive analytics, operational data analysis, public safety modeling</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Secure Event Management */}
      <section className="py-16" style={{ backgroundColor: '#F7F9FC' }}>
        <div className="max-w-5xl mx-auto px-4">
          <div className="border-l-4 border-[#2E6F95] pl-6 mb-8">
            <h2 className="mb-4" style={{ color: '#0B3C5D' }}>Secure Event Management & User Systems</h2>
          </div>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#2E6F95' }}>Challenge</h3>
              <p className="text-base leading-relaxed" style={{ color: '#1F2933' }}>
                Organizations require secure, role-based systems to manage events, users, and permissions while maintaining auditability and reliability.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#2E6F95' }}>Approach</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                  <span style={{ color: '#1F2933' }}>Designed and implemented a RESTful backend system using modern architectural patterns</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                  <span style={{ color: '#1F2933' }}>Integrated role-based access control and authentication workflows</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                  <span style={{ color: '#1F2933' }}>Implemented validation, security controls, and automated testing to ensure system integrity</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#2E6F95' }}>Outcome</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                  <span style={{ color: '#1F2933' }}>Delivered a fully functional, secure backend system</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                  <span style={{ color: '#1F2933' }}>Demonstrated production-ready coding standards and testing discipline</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                  <span style={{ color: '#1F2933' }}>Showcased real-world software engineering practices beyond prototype-level development</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
              <p className="text-sm font-semibold" style={{ color: '#2E6F95' }}>
                Capabilities demonstrated: <span className="font-normal" style={{ color: '#1F2933' }}>API design, authentication and authorization, secure systems, automated testing</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Machine Learning Model Evaluation */}
      <section className="bg-white py-16">
        <div className="max-w-5xl mx-auto px-4">
          <div className="border-l-4 border-[#2E6F95] pl-6 mb-8">
            <h2 className="mb-4" style={{ color: '#0B3C5D' }}>Machine Learning Model Evaluation & Comparison</h2>
          </div>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#2E6F95' }}>Challenge</h3>
              <p className="text-base leading-relaxed" style={{ color: '#1F2933' }}>
                Selecting the appropriate machine learning model requires objective comparison across multiple performance metrics rather than reliance on accuracy alone.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#2E6F95' }}>Approach</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                  <span style={{ color: '#1F2933' }}>Implemented and evaluated multiple classification algorithms</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                  <span style={{ color: '#1F2933' }}>Applied cross-validation to ensure generalizable performance</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                  <span style={{ color: '#1F2933' }}>Compared models using confusion matrices and performance metrics</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                  <span style={{ color: '#1F2933' }}>Documented results in a structured, reproducible format</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#2E6F95' }}>Outcome</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                  <span style={{ color: '#1F2933' }}>Clear comparison of classification models and their tradeoffs</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                  <span style={{ color: '#1F2933' }}>Demonstrated disciplined evaluation methodology aligned with real-world ML workflows</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                  <span style={{ color: '#1F2933' }}>Reinforced best practices in model validation and interpretation</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
              <p className="text-sm font-semibold" style={{ color: '#2E6F95' }}>
                Capabilities demonstrated: <span className="font-normal" style={{ color: '#1F2933' }}>Supervised learning, model evaluation, cross-validation, performance metrics</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Explainable ML for Medical Classification */}
      <section className="py-16" style={{ backgroundColor: '#F7F9FC' }}>
        <div className="max-w-5xl mx-auto px-4">
          <div className="border-l-4 border-[#2E6F95] pl-6 mb-8">
            <h2 className="mb-4" style={{ color: '#0B3C5D' }}>Explainable Machine Learning for Medical Classification</h2>
          </div>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#2E6F95' }}>Challenge</h3>
              <p className="text-base leading-relaxed" style={{ color: '#1F2933' }}>
                Healthcare-related classification problems require transparent and interpretable models that support understanding and accountability.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#2E6F95' }}>Approach</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                  <span style={{ color: '#1F2933' }}>Built decision tree models designed for interpretability</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                  <span style={{ color: '#1F2933' }}>Applied entropy-based splitting methods</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                  <span style={{ color: '#1F2933' }}>Evaluated model performance using confusion matrices and classification metrics</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#2E6F95' }}>Outcome</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                  <span style={{ color: '#1F2933' }}>Delivered interpretable machine learning models suitable for healthcare contexts</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                  <span style={{ color: '#1F2933' }}>Demonstrated explainable AI techniques appropriate for regulated environments</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
              <p className="text-sm font-semibold" style={{ color: '#2E6F95' }}>
                Capabilities demonstrated: <span className="font-normal" style={{ color: '#1F2933' }}>Decision trees, explainable machine learning, healthcare analytics</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Environmental Risk Analytics */}
      <section className="bg-white py-16">
        <div className="max-w-5xl mx-auto px-4">
          <div className="border-l-4 border-[#2E6F95] pl-6 mb-8">
            <h2 className="mb-4" style={{ color: '#0B3C5D' }}>Environmental Risk Analytics & Visualization</h2>
          </div>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#2E6F95' }}>Challenge</h3>
              <p className="text-base leading-relaxed" style={{ color: '#1F2933' }}>
                Environmental risk data is often complex and difficult to communicate effectively to non-technical stakeholders.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#2E6F95' }}>Approach</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                  <span style={{ color: '#1F2933' }}>Structured environmental and risk-related data into a clear analytical framework</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                  <span style={{ color: '#1F2933' }}>Designed a lightweight web-based interface for communicating insights</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                  <span style={{ color: '#1F2933' }}>Focused on usability, clarity, and stakeholder comprehension</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#2E6F95' }}>Outcome</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                  <span style={{ color: '#1F2933' }}>Improved accessibility of environmental risk insights</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                  <span style={{ color: '#1F2933' }}>Demonstrated the ability to translate analytical work into stakeholder-facing tools</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
              <p className="text-sm font-semibold" style={{ color: '#2E6F95' }}>
                Capabilities demonstrated: <span className="font-normal" style={{ color: '#1F2933' }}>Environmental analytics, data visualization, web-based decision support</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Analytics Engineering Foundations */}
      <section className="py-16" style={{ backgroundColor: '#F7F9FC' }}>
        <div className="max-w-5xl mx-auto px-4">
          <div className="border-l-4 border-[#2E6F95] pl-6 mb-8">
            <h2 className="mb-4" style={{ color: '#0B3C5D' }}>Analytics Engineering & Data Science Foundations</h2>
          </div>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#2E6F95' }}>Focus Areas</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                  <span style={{ color: '#1F2933' }}>Regression modeling and statistical analysis</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                  <span style={{ color: '#1F2933' }}>Association rule mining and pattern discovery</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                  <span style={{ color: '#1F2933' }}>Clean code practices, testing, and reproducibility</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                  <span style={{ color: '#1F2933' }}>Translating theoretical concepts into working analytical systems</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#2E6F95' }}>Outcome</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                  <span style={{ color: '#1F2933' }}>Strong foundation across core analytics and machine learning techniques</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                  <span style={{ color: '#1F2933' }}>Demonstrated consistency in engineering discipline and analytical rigor</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
                  <span style={{ color: '#1F2933' }}>Built reusable patterns applicable to applied analytics and AI projects</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What These Demonstrate */}
      <section className="bg-white py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="border-l-4 border-[#5FB3A2] pl-6 mb-8">
            <h2 className="mb-4" style={{ color: '#0B3C5D' }}>What These Case Studies Demonstrate</h2>
          </div>
          <p className="text-lg leading-relaxed mb-6" style={{ color: '#1F2933' }}>
            Across these completed projects, Mullen Analytics consistently delivers:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start">
              <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
              <span style={{ color: '#1F2933' }}>Decision-focused analytics, not academic exercises</span>
            </div>
            <div className="flex items-start">
              <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
              <span style={{ color: '#1F2933' }}>Secure, testable, and maintainable systems</span>
            </div>
            <div className="flex items-start">
              <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
              <span style={{ color: '#1F2933' }}>Interpretable and defensible machine learning models</span>
            </div>
            <div className="flex items-start">
              <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
              <span style={{ color: '#1F2933' }}>Applied analytics across public safety, healthcare, and environmental contexts</span>
            </div>
          </div>
        </div>
      </section>

      {/* Explore Further CTA */}
      <section className="py-24" style={{ backgroundColor: '#F7F9FC' }}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="border-l-4 border-[#5FB3A2] pl-6 mb-8 inline-block text-left">
            <h2 className="mb-4" style={{ color: '#0B3C5D' }}>Explore Further</h2>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-12">
            <a
              href="/contact"
              className="px-10 py-5 rounded-md font-semibold shadow-lg transition-all duration-200 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 text-center"
              style={{ backgroundColor: '#0B3C5D', color: '#FFFFFF' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#2E6F95'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#0B3C5D'}
            >
              Request a capabilities briefing
            </a>
            <a
              href="https://calendar.app.google/4JuyKX7s75GmJT5u9"
              target="_blank"
              rel="noopener noreferrer"
              className="px-10 py-5 rounded-md border-2 font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 text-center"
              style={{ borderColor: '#0B3C5D', color: '#0B3C5D', backgroundColor: 'transparent' }}
              onMouseEnter={(e) => { e.target.style.backgroundColor = '#0B3C5D'; e.target.style.color = '#FFFFFF'; }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = '#0B3C5D'; }}
            >
              Schedule a strategy consultation
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
