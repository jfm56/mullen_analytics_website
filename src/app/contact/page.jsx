'use client';

import ContactForm from '@/components/ContactForm';

export default function ContactPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative py-32 overflow-hidden">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/Get%20in%20Touch%20Hero.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.3)'
          }}
        />
        
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <h1 className="mb-6" style={{ color: '#FFFFFF' }}>Get in Touch</h1>
          <p className="text-xl leading-relaxed" style={{ color: '#FFFFFF' }}>
            We look forward to learning about your initiatives and exploring how we can support your data and AI strategy.
          </p>
        </div>
      </section>

      {/* Contact Information Grid */}
      <section className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Email */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4" style={{ backgroundColor: '#F8FAFD' }}>
                <svg className="w-6 h-6" style={{ color: '#071829' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold mb-2" style={{ color: '#071829' }}>Email</h3>
              <a href="mailto:jmullen@mullenanalytics.com" className="text-sm hover:underline" style={{ color: '#1D4ED8' }}>
                jmullen@mullenanalytics.com
              </a>
            </div>

            {/* Phone */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4" style={{ backgroundColor: '#F8FAFD' }}>
                <svg className="w-6 h-6" style={{ color: '#071829' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h3 className="font-semibold mb-2" style={{ color: '#071829' }}>Phone</h3>
              <a href="tel:+16092005818" className="text-sm hover:underline" style={{ color: '#1D4ED8' }}>
                (609) 200-5818
              </a>
            </div>

            {/* Address */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4" style={{ backgroundColor: '#F8FAFD' }}>
                <svg className="w-6 h-6" style={{ color: '#071829' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="font-semibold mb-2" style={{ color: '#071829' }}>Address</h3>
              <p className="text-sm" style={{ color: '#475569' }}>
                P.O. Box 2058<br />
                Southampton, NJ 08088
              </p>
            </div>

            {/* Business Hours */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4" style={{ backgroundColor: '#F8FAFD' }}>
                <svg className="w-6 h-6" style={{ color: '#071829' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold mb-2" style={{ color: '#071829' }}>Business Hours</h3>
              <p className="text-sm" style={{ color: '#475569' }}>
                Monday - Friday<br />
                9:00 AM - 5:00 PM EST
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Media */}
      <section className="py-12" style={{ backgroundColor: '#F8FAFD' }}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: '#071829' }}>Connect With Us</h2>
          <div className="flex justify-center gap-6">
            <a
              href="https://linkedin.com/company/mullen-analytics"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 hover:shadow-lg"
              style={{ backgroundColor: '#071829' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#1D4ED8'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#071829'}
            >
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
            <a
              href="https://www.facebook.com/profile.php?id=61583215691139"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 hover:shadow-lg"
              style={{ backgroundColor: '#071829' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#1D4ED8'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#071829'}
            >
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
            <a
              href="https://github.com/jfm56"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 hover:shadow-lg"
              style={{ backgroundColor: '#071829' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#1D4ED8'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#071829'}
            >
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#071829' }}>Tell Us About Your Goals</h2>
            <p className="text-lg" style={{ color: '#475569' }}>
              We look forward to learning about your initiatives and exploring how we can support your data and AI strategy.
            </p>
          </div>
          <ContactForm />
        </div>
      </section>
    </div>
  );
}
