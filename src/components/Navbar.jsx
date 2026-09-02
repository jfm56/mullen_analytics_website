'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const CALENDAR_URL = 'https://calendar.app.google/1BFgdi2pgjF9vwAB8';

// Pillar navigation. Verticals + services are grouped into a few dropdowns so the
// bar reads as a handful of pillars (Services / EMS / Healthcare) rather than a
// flat list of ~10 links. Every destination is an existing page.
const NAV = [
  { label: 'About', href: '/about' },
  {
    label: 'Services',
    items: [
      { label: 'Business Analytics', href: '/business-analytics', desc: 'KPI dashboards, forecasting & reporting' },
      { label: 'Data Engineering', href: '/services/data-engineering-and-modern-data-infrastructure', desc: 'Pipelines, warehouses & data trust' },
      { label: 'Machine Learning & Forecasting', href: '/services/machine-learning-and-predictive-modeling', desc: 'Prediction, segmentation & optimization' },
      { label: 'Automation', href: '/services/nlp-and-workflow-automation', desc: 'Reporting, documents & workflows' },
      { label: 'Dashboards & BI', href: '/services/business-intelligence-and-decision-intelligence', desc: 'Self-service dashboards & ops insights' },
    ],
    footer: { label: 'All capabilities', href: '/capabilities' },
  },
  {
    label: 'EMS & Public Safety',
    items: [
      { label: 'EMS Analytics & Consulting', href: '/first-responders', desc: 'Response times, staffing, QA/QI & forecasting' },
      { label: 'EMS QA/QI', href: '/ems-qa', desc: 'Automated chart review on your hardware' },
    ],
  },
  {
    label: 'Healthcare',
    items: [
      { label: 'Healthcare Analytics', href: '/healthcare', desc: 'Clinical operations & quality improvement' },
      { label: 'Biomedical Research', href: '/biomedical-research', desc: 'Data pipelines & outcome modeling' },
    ],
  },
  { label: 'Case Studies', href: '/portfolio' },
  { label: 'Pricing', href: '/pricing' },
  {
    label: 'Contact Us',
    items: [
      { label: 'Book a Consultation', href: CALENDAR_URL, desc: 'Free 30-min strategy call', external: true },
      { label: 'Send us a message', href: '/contact', desc: 'Questions, RFPs & project inquiries' },
    ],
  },
  { label: 'Client Portal', href: '/portal/login' },
];

const linkCls = 'text-sm font-medium text-slate-300 hover:text-white transition-colors';

// A dropdown item that links internally (Next Link) or out to an external URL
// (calendar booking, etc.) based on item.external.
function ItemLink({ item, onClick, className, children }) {
  return item.external ? (
    <a href={item.href} target="_blank" rel="noopener noreferrer" onClick={onClick}
      data-track={`nav:${item.label}`} className={className}>
      {children}
    </a>
  ) : (
    <Link href={item.href} onClick={onClick} data-track={`nav:${item.label}`} className={className}>
      {children}
    </Link>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);             // mobile drawer
  const [openMenu, setOpenMenu] = useState(null);       // desktop dropdown (by label)
  const [mobileMenu, setMobileMenu] = useState(null);   // mobile expanded section (by label)

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
        <div className="hidden lg:flex items-center gap-5">
          {NAV.map((entry) => (
            entry.items ? (
              <div key={entry.label} className="relative"
                onMouseEnter={() => setOpenMenu(entry.label)}
                onMouseLeave={() => setOpenMenu((v) => (v === entry.label ? null : v))}>
                <button
                  type="button"
                  className={`flex items-center gap-1 ${linkCls} ${openMenu === entry.label ? 'text-white' : ''}`}
                  aria-expanded={openMenu === entry.label}
                  aria-haspopup="true"
                  onClick={() => setOpenMenu((v) => (v === entry.label ? null : entry.label))}
                >
                  {entry.label}
                  <ChevronDown size={14} className={`transition-transform duration-200 ${openMenu === entry.label ? 'rotate-180' : ''}`} />
                </button>
                {openMenu === entry.label && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 w-80">
                    <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-2">
                      {entry.items.map((item) => (
                        <ItemLink
                          key={item.href}
                          item={item}
                          onClick={() => setOpenMenu(null)}
                          className="block px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                        </ItemLink>
                      ))}
                      {entry.footer && (
                        <Link
                          href={entry.footer.href}
                          onClick={() => setOpenMenu(null)}
                          className="block px-3 py-2.5 mt-1 border-t border-slate-100 text-sm font-semibold text-blue-700 hover:text-blue-800"
                        >
                          {entry.footer.label} &rarr;
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link key={entry.href} href={entry.href} className={linkCls} data-track={`nav:${entry.label}`}>{entry.label}</Link>
            )
          ))}
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
            {NAV.map((entry) => (
              entry.items ? (
                <div key={entry.label} className="border-b border-white/5">
                  <button
                    type="button"
                    onClick={() => setMobileMenu((v) => (v === entry.label ? null : entry.label))}
                    className="w-full flex items-center justify-between py-3 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                    aria-expanded={mobileMenu === entry.label}
                  >
                    {entry.label}
                    <ChevronDown size={15} className={`transition-transform duration-200 ${mobileMenu === entry.label ? 'rotate-180' : ''}`} />
                  </button>
                  {mobileMenu === entry.label && (
                    <div className="flex flex-col pb-2">
                      {entry.items.map((item) => (
                        <ItemLink key={item.href} item={item} onClick={() => setOpen(false)}
                          className="py-2 pl-4 text-sm text-slate-400 hover:text-white transition-colors">
                          {item.label}
                        </ItemLink>
                      ))}
                      {entry.footer && (
                        <Link href={entry.footer.href} onClick={() => setOpen(false)}
                          className="py-2 pl-4 text-sm font-semibold text-blue-400 hover:text-white transition-colors">
                          {entry.footer.label} &rarr;
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <Link key={entry.href} href={entry.href} onClick={() => setOpen(false)} data-track={`nav:${entry.label}`}
                  className="py-3 text-sm font-medium text-slate-300 hover:text-white border-b border-white/5 transition-colors">
                  {entry.label}
                </Link>
              )
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
