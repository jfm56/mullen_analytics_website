'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';

const NAV_LINKS = [
  { label: 'About', href: '/about' },
  { label: 'Products', href: '/products' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'EMS QA', href: '/ems-qa' },
  { label: 'Capabilities', href: '/capabilities' },
  { label: 'First Responders', href: '/first-responders' },
  { label: 'Healthcare', href: '/healthcare' },
  { label: 'Biomedical Research', href: '/biomedical-research' },
  { label: 'Case Studies', href: '/portfolio' },
  { label: 'Contact', href: '/contact' },
  { label: 'Client Portal', href: '/portal/login' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className="sticky top-0 z-50 transition-all duration-300"
      style={{
        backgroundColor: 'rgba(7,24,41,0.97)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        boxShadow: scrolled ? '0 4px 32px rgba(0,0,0,0.4)' : 'none',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/navbar-logo.png" alt="Mullen Analytics" width={36} height={36} priority className="object-contain" style={{ width: 'auto' }} />
          <span className="font-bold text-base tracking-tight" style={{ color: '#F1F5F9', letterSpacing: '-0.01em' }}>
            Mullen Analytics
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="text-sm font-medium transition-colors duration-150"
              style={{ color: '#94A3B8' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#F1F5F9')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
            >
              {label}
            </Link>
          ))}
          <a
            href="https://calendar.app.google/1BFgdi2pgjF9vwAB8"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded text-sm font-semibold transition-all duration-200"
            style={{ backgroundColor: '#1D4ED8', color: '#FFFFFF' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2563EB')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1D4ED8')}
          >
            Schedule a Call
          </a>
        </div>

        <button
          className="md:hidden p-2 rounded"
          style={{ color: '#94A3B8' }}
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <div style={{ backgroundColor: '#071829', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col gap-1">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="py-3 text-sm font-medium border-b transition-colors"
                style={{ color: '#94A3B8', borderColor: 'rgba(255,255,255,0.06)' }}
                onClick={() => setOpen(false)}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#F1F5F9')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
              >
                {label}
              </Link>
            ))}
            <a
              href="https://calendar.app.google/1BFgdi2pgjF9vwAB8"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 py-3 px-6 rounded text-sm font-semibold text-center transition-all duration-200"
              style={{ backgroundColor: '#1D4ED8', color: '#FFFFFF' }}
              onClick={() => setOpen(false)}
            >
              Schedule a Strategy Call
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
