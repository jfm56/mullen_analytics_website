'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

// The five verticals, grouped under one "Who We Serve" menu so drone + business
// are reachable (they were orphaned before) and the top bar isn't a wall of links.
const WHO_WE_SERVE = [
  { label: 'Business & Commercial', href: '/industries',         desc: 'Forecasting, KPIs & data infrastructure' },
  { label: 'First Responders',      href: '/first-responders',   desc: 'EMS, fire & public safety analytics' },
  { label: 'Drone & Geospatial',    href: '/drone-intelligence', desc: 'Survey processing, mapping & disaster response' },
  { label: 'Healthcare',            href: '/healthcare',         desc: 'Clinical operations & quality improvement' },
  { label: 'Biomedical Research',   href: '/biomedical-research', desc: 'Data pipelines & outcome modeling' },
];

const PRIMARY = [
  { label: 'About',        href: '/about' },
  { label: 'Capabilities', href: '/capabilities' },
];

const SECONDARY = [
  { label: 'Products',      href: '/products' },
  { label: 'Pricing',       href: '/pricing' },
  { label: 'EMS QA',        href: '/ems-qa' },
  { label: 'Case Studies',  href: '/portfolio' },
  { label: 'Contact',       href: '/contact' },
  { label: 'Client Portal', href: '/portal/login' },
];

const linkCls = 'text-sm font-medium text-slate-300 hover:text-white transition-colors';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);              // mobile drawer
  const [serveOpen, setServeOpen] = useState(false);     // desktop dropdown
  const [mobileServeOpen, setMobileServeOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className="sticky top-0 z-50 transition-shadow"
      style={{
        backgroundColor: 'rgba(7,24,41,0.97)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        boxShadow: scrolled ? '0 4px 32px rgba(0,0,0,0.4)' : 'none',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 flex-shrink-0">
          <Image src="/navbar-logo.png" alt="Mullen Analytics & Data Solutions" width={36} height={36} priority className="object-contain" style={{ width: 'auto' }} />
          <span className="flex flex-col leading-tight">
            <span className="font-bold text-base tracking-tight text-slate-100">Mullen Analytics</span>
            <span className="text-xs font-semibold tracking-tight text-slate-400">&amp; Data Solutions</span>
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden lg:flex items-center gap-6">
          {PRIMARY.map(({ label, href }) => (
            <Link key={href} href={href} className={linkCls}>{label}</Link>
          ))}

          {/* Who We Serve dropdown */}
          <div className="relative" onMouseEnter={() => setServeOpen(true)} onMouseLeave={() => setServeOpen(false)}>
            <button
              type="button"
              className={`flex items-center gap-1 ${linkCls} ${serveOpen ? 'text-white' : ''}`}
              aria-expanded={serveOpen}
              aria-haspopup="true"
              onClick={() => setServeOpen((v) => !v)}
            >
              Who We Serve
              <ChevronDown size={14} className={`transition-transform duration-200 ${serveOpen ? 'rotate-180' : ''}`} />
            </button>
            {serveOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 w-80">
                <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-2">
                  {WHO_WE_SERVE.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setServeOpen(false)}
                      className="block px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {SECONDARY.map(({ label, href }) => (
            <Link key={href} href={href} className={linkCls}>{label}</Link>
          ))}

          <Link
            href="/signup"
            className="px-4 py-2 rounded text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            Get started
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="lg:hidden p-2 rounded text-slate-300 hover:text-white"
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

      {/* Mobile drawer */}
      {open && (
        <div style={{ backgroundColor: '#071829', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col">
            {PRIMARY.map(({ label, href }) => (
              <Link key={href} href={href} onClick={() => setOpen(false)}
                className="py-3 text-sm font-medium text-slate-300 hover:text-white border-b border-white/5 transition-colors">
                {label}
              </Link>
            ))}

            {/* Who We Serve — expandable */}
            <button
              type="button"
              onClick={() => setMobileServeOpen((v) => !v)}
              className="flex items-center justify-between py-3 text-sm font-medium text-slate-300 hover:text-white border-b border-white/5 transition-colors"
              aria-expanded={mobileServeOpen}
            >
              Who We Serve
              <ChevronDown size={15} className={`transition-transform duration-200 ${mobileServeOpen ? 'rotate-180' : ''}`} />
            </button>
            {mobileServeOpen && (
              <div className="flex flex-col border-b border-white/5 py-1">
                {WHO_WE_SERVE.map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                    className="py-2 pl-4 text-sm text-slate-400 hover:text-white transition-colors">
                    {item.label}
                  </Link>
                ))}
              </div>
            )}

            {SECONDARY.map(({ label, href }) => (
              <Link key={href} href={href} onClick={() => setOpen(false)}
                className="py-3 text-sm font-medium text-slate-300 hover:text-white border-b border-white/5 transition-colors">
                {label}
              </Link>
            ))}

            <Link
              href="/signup"
              onClick={() => setOpen(false)}
              className="mt-4 py-3 px-6 rounded text-sm font-semibold text-center bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
