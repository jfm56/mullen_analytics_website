'use client';

// Re-show the cookie banner by clearing the stored consent choice, then reloading.
// (Cookie name matches `cookieName` in CookieConsent.jsx.)
function reopenCookiePreferences() {
  document.cookie = 'mullen-analytics-cookie-consent=; Max-Age=0; path=/';
  window.location.reload();
}

const NAV_LINKS = [
  { label: 'About', href: '/about' },
  { label: 'Products', href: '/products' },
  { label: 'Capabilities', href: '/capabilities' },
  { label: 'First Responders', href: '/first-responders' },
  { label: 'Healthcare', href: '/healthcare' },
  { label: 'Biomedical Research', href: '/biomedical-research' },
  { label: 'Case Studies', href: '/portfolio' },
  { label: 'Contact', href: '/contact' },
  { label: 'Client Portal', href: '/portal/login' },
];

function SocialBtn({ href, label, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="w-9 h-9 rounded flex items-center justify-center transition-all duration-200"
      style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#64748B' }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1D4ED8'; e.currentTarget.style.color = '#FFFFFF'; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#64748B'; }}
    >
      {children}
    </a>
  );
}

export default function Footer() {
  return (
    <footer style={{ backgroundColor: '#040E1C', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-12 mb-12">

          {/* Brand */}
          <div>
            <p className="text-sm font-bold mb-1" style={{ color: '#F1F5F9', letterSpacing: '-0.01em' }}>
              Mullen Analytics &amp; AI Consulting
            </p>
            <p className="text-xs mb-2 font-semibold uppercase tracking-widest" style={{ color: '#1D4ED8' }}>
              Veteran-Owned
            </p>
            <p className="text-sm leading-relaxed mb-6" style={{ color: '#334155', maxWidth: '280px' }}>
              Analytics and AI consulting for EMS, fire, public safety, hospitals, and healthcare organizations. Built by operators, for operators.
            </p>
            <div className="flex items-center gap-3">
              <SocialBtn href="https://www.linkedin.com/company/mullen-analytics" label="LinkedIn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8.5h4V24h-4V8.5zM8.5 8.5h3.8v2.1h.05c.53-1 1.84-2.1 3.79-2.1 4.06 0 4.81 2.67 4.81 6.14V24h-4v-6.67c0-1.59-.03-3.64-2.22-3.64-2.22 0-2.56 1.73-2.56 3.52V24h-4V8.5z"/>
                </svg>
              </SocialBtn>
              <SocialBtn href="https://www.facebook.com/profile.php?id=61583215691139" label="Facebook">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.675 0h-21.35C.597 0 0 .597 0 1.326v21.348C0 23.403.597 24 1.326 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.79 4.659-4.79 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.796.715-1.796 1.765v2.315h3.59l-.467 3.622h-3.123V24h6.125C23.403 24 24 23.403 24 22.674V1.326C24 .597 23.403 0 22.675 0z"/>
                </svg>
              </SocialBtn>
              <SocialBtn href="mailto:hello@mullenanalytics.com" label="Email">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 13.065 0 6V4l12 7 12-7v2z"/><path d="M0 6.5 12 13l12-6.5V20a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2z"/>
                </svg>
              </SocialBtn>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-6" style={{ color: '#334155' }}>Navigation</p>
            <div className="flex flex-col gap-3">
              {NAV_LINKS.map(({ label, href }) => (
                <a
                  key={href}
                  href={href}
                  className="text-sm transition-colors duration-150"
                  style={{ color: '#475569' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#CBD5E1')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
                >
                  {label}
                </a>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-6" style={{ color: '#334155' }}>Contact</p>
            <div className="flex flex-col gap-3">
              <a
                href="tel:16092005818"
                className="text-sm transition-colors duration-150"
                style={{ color: '#475569' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#CBD5E1')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
              >
                609-200-5818
              </a>
              <a
                href="mailto:hello@mullenanalytics.com"
                className="text-sm transition-colors duration-150"
                style={{ color: '#475569' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#CBD5E1')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
              >
                hello@mullenanalytics.com
              </a>
              <a
                href="https://calendar.app.google/1BFgdi2pgjF9vwAB8"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 px-5 py-2.5 rounded text-sm font-semibold text-center transition-all duration-200"
                style={{ backgroundColor: '#1D4ED8', color: '#FFFFFF' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2563EB')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1D4ED8')}
              >
                Schedule a Strategy Call
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-xs" style={{ color: '#64748B' }} suppressHydrationWarning>
            &copy; {new Date().getFullYear()} Mullen Analytics &amp; AI Consulting. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <a
              href="/privacy"
              className="text-xs transition-colors duration-150"
              style={{ color: '#94A3B8' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#F1F5F9')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
            >
              Privacy Policy
            </a>
            <button
              type="button"
              onClick={reopenCookiePreferences}
              className="text-xs transition-colors duration-150"
              style={{ color: '#94A3B8', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#F1F5F9')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
            >
              Cookie Preferences
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
