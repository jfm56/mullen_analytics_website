'use client';

import Image from 'next/image';

export default function AboutPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative py-32 overflow-hidden">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/About%20hero.avif)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.3)'
          }}
        />
        
        <div className="relative max-w-7xl mx-auto px-4">
          <div className="max-w-3xl">
            <div className="border-l-4 border-[#5FB3A2] pl-6 mb-8">
              <h1 className="mb-4" style={{ color: '#FFFFFF' }}>About Mullen Analytics & AI Consulting</h1>
            </div>
            <p className="text-xl leading-relaxed" style={{ color: '#FFFFFF' }}>
              Mullen Analytics & AI Consulting is a New Jersey–based analytics and artificial intelligence firm focused on helping organizations make better decisions in high-stakes, operational environments. We specialize in predictive analytics, machine learning, and decision intelligence systems designed to support accountability, transparency, and real-world action.
            </p>
          </div>
        </div>
      </section>

      {/* Company Overview */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-lg leading-relaxed mb-6" style={{ color: '#1F2933' }}>
                Our work serves public safety agencies, healthcare systems, government organizations, and mission-critical operations where decisions must be accurate, explainable, and defensible. We don&apos;t build experimental models or one-off dashboards — we design analytics systems leaders can trust, defend, and operationalize.
              </p>
              <p className="text-lg leading-relaxed" style={{ color: '#1F2933' }}>
                What sets Mullen Analytics apart is the combination of deep technical expertise and real-world operational experience. Every solution is grounded in disciplined methodology, clear assumptions, and an understanding of how decisions are actually made under pressure.
              </p>
            </div>
            <div className="aspect-[4/3] bg-gray-200 rounded-lg overflow-hidden">
              <img src="/Our work serves .jpg" alt="Our work serves" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Our Approach */}
      <section className="py-16" style={{ backgroundColor: '#F7F9FC' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="aspect-[4/3] bg-gray-200 rounded-lg overflow-hidden">
              <img src="/Our Approach.webp" alt="Our Approach" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="border-l-4 border-[#2E6F95] pl-6 mb-8">
                <h2 className="mb-4" style={{ color: '#0B3C5D' }}>Our Approach</h2>
              </div>
              <p className="text-lg leading-relaxed mb-8" style={{ color: '#1F2933' }}>
                We believe analytics should reduce uncertainty — not introduce new risk. That&apos;s why our work emphasizes:
              </p>
          <div className="space-y-4">
            <div className="flex items-start">
              <span className="mr-4 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
              <div>
                <p className="font-semibold mb-1" style={{ color: '#0B3C5D' }}>Explainable and transparent models</p>
                <p style={{ color: '#4B5563' }}>Not black-box outputs</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="mr-4 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
              <div>
                <p className="font-semibold mb-1" style={{ color: '#0B3C5D' }}>Operational relevance</p>
                <p style={{ color: '#4B5563' }}>Aligned to how teams plan, staff, and execute</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="mr-4 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
              <div>
                <p className="font-semibold mb-1" style={{ color: '#0B3C5D' }}>Defensible decision support</p>
                <p style={{ color: '#4B5563' }}>Suitable for audits, leadership review, and public accountability</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="mr-4 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#5FB3A2' }} />
              <div>
                <p className="font-semibold mb-1" style={{ color: '#0B3C5D' }}>Systems that endure</p>
                <p style={{ color: '#4B5563' }}>Designed to scale, adapt, and remain useful over time</p>
              </div>
            </div>
          </div>
              <p className="text-lg leading-relaxed mt-8" style={{ color: '#1F2933' }}>
                We partner closely with clients to ensure they understand not just <em>what</em> the data says, but <em>why</em> it says it — and how to act on it with confidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="border-l-4 border-[#2E6F95] pl-6 mb-12">
            <h2 className="mb-4" style={{ color: '#0B3C5D' }}>About the Founder</h2>
          </div>
          
          <div className="grid md:grid-cols-5 gap-12 items-start">
            <div className="md:col-span-2">
              <div className="relative w-full aspect-[4/5] overflow-hidden rounded-lg border" style={{ borderColor: '#E5E7EB' }}>
                <Image
                  src="/head-shot.jpeg"
                  alt="James Mullen, Founder"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>
            
            <div className="md:col-span-3 space-y-6">
              <p className="text-lg leading-relaxed" style={{ color: '#1F2933' }}>
                Mullen Analytics was founded by James Mullen, a data scientist, veteran, and former paramedic with over a decade of experience working in high-pressure operational environments.
              </p>
              <p className="text-lg leading-relaxed" style={{ color: '#1F2933' }}>
                Before founding the firm, James spent years in emergency services and the military, where decisions had immediate real-world consequences. That background continues to shape how Mullen Analytics approaches data science: models must be reliable, explainable, and built with an understanding of operational reality — not just technical performance.
              </p>
              <p className="text-lg leading-relaxed" style={{ color: '#1F2933' }}>
                James holds an undergraduate degree in Biology and advanced graduate training in Data Science, with additional specialization in machine learning, analytics engineering, and applied AI. His work spans public safety operations, healthcare analytics, environmental and ecological modeling, and enterprise decision systems.
              </p>
              <p className="text-lg leading-relaxed" style={{ color: '#1F2933' }}>
                By combining hands-on operational experience with rigorous data science, Mullen Analytics bridges the gap between advanced analytics and real-world decision-making.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20" style={{ backgroundColor: '#F7F9FC' }}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xl mb-8" style={{ color: '#1F2933' }}>
            If you&apos;re exploring how analytics or AI can support critical decisions in your organization, we&apos;d welcome the opportunity to talk.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="/contact"
              className="inline-block px-10 py-5 rounded-md font-semibold shadow-lg transition-all duration-200 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{ backgroundColor: '#0B3C5D', color: '#FFFFFF' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#2E6F95'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#0B3C5D'}
            >
              Get in touch
            </a>
            <a
              href="/portfolio"
              className="inline-block px-10 py-5 rounded-md border-2 font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{ borderColor: '#0B3C5D', color: '#0B3C5D', backgroundColor: 'transparent' }}
              onMouseEnter={(e) => { e.target.style.backgroundColor = '#0B3C5D'; e.target.style.color = '#FFFFFF'; }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = '#0B3C5D'; }}
            >
              View our work
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
