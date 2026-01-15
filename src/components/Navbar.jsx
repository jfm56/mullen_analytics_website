 'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const base = 'sticky top-0 z-50 backdrop-blur transition-colors duration-300';
  const bg = scrolled ? 'bg-white/90 border-b shadow-sm' : 'bg-white/50';

  const linkCls =
    'relative transition-colors text-sm text-black hover:text-[var(--brand-primary)]';
  const underline =
    'after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-0 after:bg-[var(--brand-primary)] after:transition-all hover:after:w-full';

  return (
    <nav className={`${base} ${bg}`}>
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/navbar-logo.png" alt="Mullen Analytics logo" width={40} height={40} priority className="object-contain" style={{ height: 'auto' }} />
          <span className="font-bold text-lg tracking-tight">Mullen Analytics</span>
        </Link>
        <button
          className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-black/80 hover:text-black focus:outline-none"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="hidden md:flex gap-6">
          <Link href="/about" className={`${linkCls} ${underline}`}>About</Link>
          <Link href="/capabilities" className={`${linkCls} ${underline}`}>Capabilities</Link>
          <Link href="/technology" className={`${linkCls} ${underline}`}>Technology</Link>
          <Link href="/industries" className={`${linkCls} ${underline}`}>Industries</Link>
          <Link href="/portfolio" className={`${linkCls} ${underline}`}>Case Studies</Link>
          <Link href="/contact" className={`${linkCls} ${underline}`}>Contact</Link>
          <Link href="/portal/login" className={`${linkCls} ${underline}`}>Client Portal</Link>
          <a
            href="https://calendar.app.google/1BFgdi2pgjF9vwAB8"
            target="_blank"
            rel="noopener noreferrer"
            className={`${linkCls} ${underline}`}
          >
            Schedule
          </a>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t bg-white/95 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-3">
            <Link href="/about" className={linkCls} onClick={() => setOpen(false)}>About</Link>
            <Link href="/capabilities" className={linkCls} onClick={() => setOpen(false)}>Capabilities</Link>
            <Link href="/technology" className={linkCls} onClick={() => setOpen(false)}>Technology</Link>
            <Link href="/industries" className={linkCls} onClick={() => setOpen(false)}>Industries</Link>
            <Link href="/portfolio" className={linkCls} onClick={() => setOpen(false)}>Case Studies</Link>
            <Link href="/contact" className={linkCls} onClick={() => setOpen(false)}>Contact</Link>
            <Link href="/portal/login" className={linkCls} onClick={() => setOpen(false)}>Client Portal</Link>
            <a
              href="https://calendar.app.google/1BFgdi2pgjF9vwAB8"
              target="_blank"
              rel="noopener noreferrer"
              className={linkCls}
              onClick={() => setOpen(false)}
            >
              Schedule
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
