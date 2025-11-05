 'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

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
          <Image src="/logo.png" alt="Mullen Analytics logo" width={36} height={36} priority />
          <span className="font-bold text-lg tracking-tight">Mullen Analytics</span>
        </Link>
        <div className="hidden md:flex gap-6">
          <Link href="/about" className={`${linkCls} ${underline}`}>About</Link>
          <Link href="/#services" className={`${linkCls} ${underline}`}>Services</Link>
          <Link href="/#portfolio" className={`${linkCls} ${underline}`}>Portfolio</Link>
          <Link href="/blog" className={`${linkCls} ${underline}`}>Blog</Link>
          <Link href="/#contact" className={`${linkCls} ${underline}`}>Contact</Link>
        </div>
      </div>
    </nav>
  );
}
