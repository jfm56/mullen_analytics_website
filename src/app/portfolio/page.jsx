'use client';

export default function PortfolioPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden" style={{ backgroundColor: '#071829' }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url(/particle-wave.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        
        <div className="relative max-w-7xl mx-auto px-4 py-24 md:py-32">
          <div className="max-w-4xl">
            <div className="border-l-4 border-[#0EA5E9] pl-6 mb-8">
              <h1 className="mb-6" style={{ color: '#FFFFFF' }}>
                Portfolio & Case Studies
              </h1>
            </div>
            <div className="h-px bg-[#0EA5E9] w-24 mb-8" />
            <p className="text-xl text-gray-200 leading-relaxed max-w-3xl">
              Selected analytics, AI, and systems work delivered for EMS, public safety, and healthcare environments. Every project here is built around operational decision-making — not academic experimentation.
            </p>
          </div>
        </div>
      </section>

      {/* EMS Demand & Operational Analytics */}
      <section className="bg-white py-16">
        <div className="max-w-5xl mx-auto px-4">
          <div className="border-l-4 border-[#1D4ED8] pl-6 mb-8">
            <h2 className="mb-4" style={{ color: '#071829' }}>EMS Demand & Operational Analytics</h2>
          </div>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1D4ED8' }}>Challenge</h3>
              <p className="text-base leading-relaxed" style={{ color: '#1E293B' }}>
                Emergency services operate under fluctuating demand patterns that make staffing and coverage decisions difficult without data-driven insight.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1D4ED8' }}>Approach</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
                  <span style={{ color: '#1E293B' }}>Analyzed EMS call and operational data to identify demand patterns and workload drivers</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
                  <span style={{ color: '#1E293B' }}>Applied statistical and predictive modeling techniques to understand trends over time</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
                  <span style={{ color: '#1E293B' }}>Structured analytical outputs to support operational decision-making rather than academic experimentation</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1D4ED8' }}>Outcome</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
                  <span style={{ color: '#1E293B' }}>Improved visibility into EMS call behavior and operational drivers</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
                  <span style={{ color: '#1E293B' }}>Established a reusable analytical framework for future forecasting and staffing studies</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
                  <span style={{ color: '#1E293B' }}>Demonstrated how data science can support real-world public safety decisions</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
              <p className="text-sm font-semibold" style={{ color: '#1D4ED8' }}>
                Capabilities demonstrated: <span className="font-normal" style={{ color: '#1E293B' }}>Predictive analytics, operational data analysis, public safety modeling</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Explainable ML for Medical Classification - moved up */}
      <section className="py-16" style={{ backgroundColor: '#F8FAFD' }}>
        <div className="max-w-5xl mx-auto px-4">
          <div className="border-l-4 border-[#1D4ED8] pl-6 mb-8">
            <h2 className="mb-4" style={{ color: '#071829' }}>Explainable Machine Learning for Healthcare Classification</h2>
          </div>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1D4ED8' }}>Challenge</h3>
              <p className="text-base leading-relaxed" style={{ color: '#1E293B' }}>
                Healthcare classification problems require transparent and interpretable models that clinicians and administrators can understand, audit, and defend to leadership and regulators.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1D4ED8' }}>Approach</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
                  <span style={{ color: '#1E293B' }}>Built interpretable decision tree models using entropy-based splitting designed for clinical transparency</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
                  <span style={{ color: '#1E293B' }}>Evaluated model performance using confusion matrices and classification metrics appropriate for regulated healthcare contexts</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
                  <span style={{ color: '#1E293B' }}>Documented assumptions, thresholds, and decision logic to support audit and review</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1D4ED8' }}>Outcome</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
                  <span style={{ color: '#1E293B' }}>Delivered interpretable ML models suitable for clinical and administrative healthcare decision support</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
                  <span style={{ color: '#1E293B' }}>Demonstrated explainable AI techniques appropriate for regulated, accountability-driven environments</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
              <p className="text-sm font-semibold" style={{ color: '#1D4ED8' }}>
                Capabilities demonstrated: <span className="font-normal" style={{ color: '#1E293B' }}>Explainable machine learning, healthcare analytics, clinical decision support, model interpretability</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Secure Event Management */}
      <section className="bg-white py-16">
        <div className="max-w-5xl mx-auto px-4">
          <div className="border-l-4 border-[#1D4ED8] pl-6 mb-8">
            <h2 className="mb-4" style={{ color: '#071829' }}>Secure Event Management & User Systems</h2>
          </div>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1D4ED8' }}>Challenge</h3>
              <p className="text-base leading-relaxed" style={{ color: '#1E293B' }}>
                Organizations require secure, role-based systems to manage events, users, and permissions while maintaining auditability and reliability.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1D4ED8' }}>Approach</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
                  <span style={{ color: '#1E293B' }}>Designed and implemented a RESTful backend system using modern architectural patterns</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
                  <span style={{ color: '#1E293B' }}>Integrated role-based access control and authentication workflows</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
                  <span style={{ color: '#1E293B' }}>Implemented validation, security controls, and automated testing to ensure system integrity</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1D4ED8' }}>Outcome</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
                  <span style={{ color: '#1E293B' }}>Delivered a fully functional, secure backend system</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
                  <span style={{ color: '#1E293B' }}>Demonstrated production-ready coding standards and testing discipline</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
                  <span style={{ color: '#1E293B' }}>Showcased real-world software engineering practices beyond prototype-level development</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
              <p className="text-sm font-semibold" style={{ color: '#1D4ED8' }}>
                Capabilities demonstrated: <span className="font-normal" style={{ color: '#1E293B' }}>API design, authentication and authorization, secure systems, automated testing</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Machine Learning Model Evaluation */}
      <section className="bg-white py-16">
        <div className="max-w-5xl mx-auto px-4">
          <div className="border-l-4 border-[#1D4ED8] pl-6 mb-8">
            <h2 className="mb-4" style={{ color: '#071829' }}>Machine Learning Model Evaluation & Comparison</h2>
          </div>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1D4ED8' }}>Challenge</h3>
              <p className="text-base leading-relaxed" style={{ color: '#1E293B' }}>
                Selecting the appropriate machine learning model requires objective comparison across multiple performance metrics rather than reliance on accuracy alone.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1D4ED8' }}>Approach</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
                  <span style={{ color: '#1E293B' }}>Implemented and evaluated multiple classification algorithms</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
                  <span style={{ color: '#1E293B' }}>Applied cross-validation to ensure generalizable performance</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
                  <span style={{ color: '#1E293B' }}>Compared models using confusion matrices and performance metrics</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
                  <span style={{ color: '#1E293B' }}>Documented results in a structured, reproducible format</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1D4ED8' }}>Outcome</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
                  <span style={{ color: '#1E293B' }}>Clear comparison of classification models and their tradeoffs</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
                  <span style={{ color: '#1E293B' }}>Demonstrated disciplined evaluation methodology aligned with real-world ML workflows</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
                  <span style={{ color: '#1E293B' }}>Reinforced best practices in model validation and interpretation</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
              <p className="text-sm font-semibold" style={{ color: '#1D4ED8' }}>
                Capabilities demonstrated: <span className="font-normal" style={{ color: '#1E293B' }}>Supervised learning, model evaluation, cross-validation, performance metrics</span>
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* Environmental Risk Analytics */}
      <section className="bg-white py-16">
        <div className="max-w-5xl mx-auto px-4">
          <div className="border-l-4 border-[#1D4ED8] pl-6 mb-8">
            <h2 className="mb-4" style={{ color: '#071829' }}>Environmental Risk Analytics & Visualization</h2>
          </div>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1D4ED8' }}>Challenge</h3>
              <p className="text-base leading-relaxed" style={{ color: '#1E293B' }}>
                Environmental risk data is often complex and difficult to communicate effectively to non-technical stakeholders.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1D4ED8' }}>Approach</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
                  <span style={{ color: '#1E293B' }}>Structured environmental and risk-related data into a clear analytical framework</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
                  <span style={{ color: '#1E293B' }}>Designed a lightweight web-based interface for communicating insights</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
                  <span style={{ color: '#1E293B' }}>Focused on usability, clarity, and stakeholder comprehension</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1D4ED8' }}>Outcome</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
                  <span style={{ color: '#1E293B' }}>Improved accessibility of environmental risk insights</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
                  <span style={{ color: '#1E293B' }}>Demonstrated the ability to translate analytical work into stakeholder-facing tools</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
              <p className="text-sm font-semibold" style={{ color: '#1D4ED8' }}>
                Capabilities demonstrated: <span className="font-normal" style={{ color: '#1E293B' }}>Environmental analytics, data visualization, web-based decision support</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Analytics Engineering Foundations */}
      <section className="py-16" style={{ backgroundColor: '#F8FAFD' }}>
        <div className="max-w-5xl mx-auto px-4">
          <div className="border-l-4 border-[#1D4ED8] pl-6 mb-8">
            <h2 className="mb-4" style={{ color: '#071829' }}>Analytics Engineering & Data Science Foundations</h2>
          </div>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1D4ED8' }}>Focus Areas</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
                  <span style={{ color: '#1E293B' }}>Regression modeling and statistical analysis</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
                  <span style={{ color: '#1E293B' }}>Association rule mining and pattern discovery</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
                  <span style={{ color: '#1E293B' }}>Clean code practices, testing, and reproducibility</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
                  <span style={{ color: '#1E293B' }}>Translating theoretical concepts into working analytical systems</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1D4ED8' }}>Outcome</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
                  <span style={{ color: '#1E293B' }}>Strong foundation across core analytics and machine learning techniques</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
                  <span style={{ color: '#1E293B' }}>Demonstrated consistency in engineering discipline and analytical rigor</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
                  <span style={{ color: '#1E293B' }}>Built reusable patterns applicable to applied analytics and AI projects</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What These Demonstrate */}
      <section className="bg-white py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="border-l-4 border-[#0EA5E9] pl-6 mb-8">
            <h2 className="mb-4" style={{ color: '#071829' }}>What These Case Studies Demonstrate</h2>
          </div>
          <p className="text-lg leading-relaxed mb-6" style={{ color: '#1E293B' }}>
            Across these projects, Mullen Analytics delivers work built specifically for EMS, healthcare, and public safety:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start">
              <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
              <span style={{ color: '#1E293B' }}>Operational analytics built for EMS agencies and healthcare organizations</span>
            </div>
            <div className="flex items-start">
              <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
              <span style={{ color: '#1E293B' }}>Explainable, defensible models that leadership can stand behind</span>
            </div>
            <div className="flex items-start">
              <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
              <span style={{ color: '#1E293B' }}>Secure, audit-ready systems designed for regulated environments</span>
            </div>
            <div className="flex items-start">
              <span className="mr-3 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#0EA5E9' }} />
              <span style={{ color: '#1E293B' }}>Production-ready analytics, not prototypes or proof-of-concept experiments</span>
            </div>
          </div>
        </div>
      </section>

      {/* Explore Further CTA */}
      <section className="py-24" style={{ backgroundColor: '#F8FAFD' }}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="border-l-4 border-[#0EA5E9] pl-6 mb-8 inline-block text-left">
            <h2 className="mb-4" style={{ color: '#071829' }}>Explore Further</h2>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-12">
            <a
              href="/contact"
              className="px-10 py-5 rounded-md font-semibold shadow-lg transition-all duration-200 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 text-center"
              style={{ backgroundColor: '#071829', color: '#FFFFFF' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#1D4ED8'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#071829'}
            >
              Request a capabilities briefing
            </a>
            <a
              href="https://calendar.app.google/4JuyKX7s75GmJT5u9"
              target="_blank"
              rel="noopener noreferrer"
              className="px-10 py-5 rounded-md border-2 font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 text-center"
              style={{ borderColor: '#071829', color: '#071829', backgroundColor: 'transparent' }}
              onMouseEnter={(e) => { e.target.style.backgroundColor = '#071829'; e.target.style.color = '#FFFFFF'; }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = '#071829'; }}
            >
              Schedule a strategy consultation
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
