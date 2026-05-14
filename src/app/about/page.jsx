'use client';

import Image from 'next/image';

const TRUST_PILLARS = [
  {
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    label: 'Veteran-Owned & Operated',
  },
  {
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    label: 'Real-World Operational Experience',
  },
  {
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
    label: 'Explainable AI You Can Trust',
  },
  {
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    label: 'Security & Compliance Focused',
  },
];

const APPROACH_ITEMS = [
  { title: 'Explainable and transparent models', sub: 'Not black-box outputs' },
  { title: 'Operational relevance', sub: 'Aligned to how teams plan, staff, and execute' },
  { title: 'Defensible decision support', sub: 'Suitable for audits, leadership review, and public accountability' },
  { title: 'Systems that endure', sub: 'Designed to scale, adapt, and remain useful over time' },
];

export default function AboutPage() {
  return (
    <div>

      {/* HERO */}
      <section className="w-full overflow-hidden">
        <img
          src="/about%20hero%20img.png"
          alt="Analytics and operations command center"
          className="w-full block"
          style={{ height: 'auto' }}
        />
      </section>

      {/* WHO WE ARE */}
      <section className="py-24" style={{ background: 'linear-gradient(180deg, #0A1929 0%, #071829 100%)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#0EA5E9', letterSpacing: '0.2em' }}>Who We Are</p>
              <h2 className="text-3xl md:text-4xl font-bold mb-8" style={{ color: '#FFFFFF', lineHeight: 1.1 }}>
                We Understand Your World
              </h2>
              <div className="space-y-5">
                <p className="text-base leading-relaxed" style={{ color: '#94A3B8' }}>
                  We are not a general consulting firm that occasionally works with healthcare or public safety clients.
                </p>
                <p className="text-base leading-relaxed" style={{ color: '#94A3B8' }}>
                  EMS, fire, hospitals, and healthcare operations are our entire focus. That specialization means we understand the pressure, the accountability, and the stakes involved — because we have worked in those environments.
                </p>
                <p className="text-base leading-relaxed" style={{ color: '#94A3B8' }}>
                  We do not build experimental models or one-off dashboards.
                </p>
                <p className="text-base leading-relaxed" style={{ color: '#94A3B8' }}>
                  We design analytics and AI systems that leaders can trust, defend in front of boards and auditors, and actually use in day-to-day operations.
                </p>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl" style={{ boxShadow: '0 24px 60px rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <img
                src="/Our%20work%20serves%20.jpg"
                alt="Healthcare and public safety operations team"
                className="w-full block"
                style={{ maxHeight: '480px', objectFit: 'cover', objectPosition: 'center' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* OUR APPROACH */}
      <section className="py-24" style={{ backgroundColor: '#F8FAFD' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative overflow-hidden rounded-2xl" style={{ boxShadow: '0 24px 60px rgba(7,24,41,0.12)' }}>
              <img
                src="/Our%20Approach.webp"
                alt="Our operational analytics approach"
                className="w-full block"
                style={{ maxHeight: '520px', objectFit: 'cover', objectPosition: 'center' }}
              />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#1D4ED8', letterSpacing: '0.2em' }}>Our Approach</p>
              <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: '#071829', lineHeight: 1.1 }}>
                Analytics That Reflect Reality
              </h2>
              <p className="text-base leading-relaxed mb-8" style={{ color: '#475569' }}>
                In EMS and healthcare, a bad model is not just an inconvenience — it affects staffing, response, and patient outcomes. That is why every system we build is grounded in operational reality and built to be:
              </p>
              <div className="space-y-4 mb-8">
                {APPROACH_ITEMS.map((item) => (
                  <div key={item.title} className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8' }}>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold mb-0.5" style={{ color: '#071829' }}>{item.title}</p>
                      <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-base leading-relaxed" style={{ color: '#475569' }}>
                We work closely with operational leaders, medical directors, and department heads — not just IT — to ensure analytics systems are adopted, understood, and acted on at every level of the organization.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT THE FOUNDER */}
      <section className="py-24" style={{ background: 'linear-gradient(180deg, #071829 0%, #0D2035 100%)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-14" style={{ borderLeft: '3px solid #0EA5E9', paddingLeft: '1.25rem' }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#0EA5E9', letterSpacing: '0.2em' }}>About the Founder</p>
            <h2 className="text-3xl md:text-4xl font-bold" style={{ color: '#FFFFFF' }}>
              Experience. Credibility. Mission Aligned.
            </h2>
          </div>
          <div className="grid lg:grid-cols-5 gap-14 items-start">
            <div className="lg:col-span-2">
              <div className="relative overflow-hidden rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}>
                <Image
                  src="/head-shot.jpeg"
                  alt="James Mullen, Founder — Veteran & Former Paramedic"
                  width={480}
                  height={580}
                  className="w-full object-cover"
                  priority
                  sizes="(max-width: 1024px) 100vw, 40vw"
                />
              </div>
            </div>
            <div className="lg:col-span-3 space-y-6">
              <p className="text-base leading-relaxed" style={{ color: '#94A3B8' }}>
                Mullen Analytics was founded by James Mullen — a veteran, former paramedic, and data scientist with over a decade of experience in high-pressure operational environments.
              </p>
              <p className="text-base leading-relaxed" style={{ color: '#94A3B8' }}>
                James served in the military and worked in emergency medical services before transitioning into data science and analytics to help organizations make better decisions with the data they already have.
              </p>
              <p className="text-base leading-relaxed" style={{ color: '#94A3B8' }}>
                He holds a degree in Biology and advanced graduate training in Data Science, with specialization in machine learning, predictive modeling, and applied AI for healthcare and public safety operations.
              </p>
              <div className="mt-8 p-6 rounded-xl" style={{ backgroundColor: 'rgba(14,165,233,0.07)', border: '1px solid rgba(14,165,233,0.2)' }}>
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(14,165,233,0.15)', color: '#0EA5E9' }}>
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold mb-1" style={{ color: '#E2E8F0' }}>Mullen Analytics is veteran-owned.</p>
                    <p className="text-sm leading-relaxed" style={{ color: '#94A3B8' }}>Our work is built on operational credibility, not just technical credentials.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-28" style={{ background: 'linear-gradient(135deg, #071829 0%, #0D2240 50%, #071829 100%)' }}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-8" style={{ backgroundColor: 'rgba(14,165,233,0.12)', color: '#0EA5E9' }}>
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: '#FFFFFF', lineHeight: 1.12, letterSpacing: '-0.02em' }}>
            Let&apos;s Build Better Decisions—Together
          </h2>
          <p className="text-lg mb-12 leading-relaxed mx-auto" style={{ color: '#475569', maxWidth: '560px' }}>
            If your EMS agency, hospital, or public safety organization is looking to improve operations, staffing, or decision-making with analytics and AI, we would welcome the opportunity to talk.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/contact"
              className="px-10 py-5 rounded font-semibold text-base text-center transition-all duration-200"
              style={{ backgroundColor: '#1D4ED8', color: '#FFFFFF' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2563EB')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1D4ED8')}
            >
              Get In Touch
            </a>
            <a
              href="/portfolio"
              className="px-10 py-5 rounded font-semibold text-base text-center transition-all duration-200"
              style={{ backgroundColor: 'transparent', color: '#E2E8F0', border: '1px solid #1E3A58' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#4A6FA5'; e.currentTarget.style.color = '#FFFFFF'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1E3A58'; e.currentTarget.style.color = '#E2E8F0'; }}
            >
              View Our Work
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
