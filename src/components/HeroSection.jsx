 export default function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Background: subtle premium particle-wave */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <svg className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/4 w-[1400px] h-[800px] opacity-60" viewBox="0 0 1400 800" fill="none">
          <defs>
            <radialGradient id="g1" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(700 200) rotate(90) scale(300 700)">
              <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0.35" />
              <stop offset="60%" stopColor="var(--brand-primary)" stopOpacity="0.12" />
              <stop offset="100%" stopColor="var(--brand-primary)" stopOpacity="0" />
            </radialGradient>
            <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="40" />
            </filter>
          </defs>
          {/* Soft gradient blob */}
          <ellipse cx="700" cy="260" rx="520" ry="180" fill="url(#g1)" filter="url(#blur)" />
          {/* Fine particle field */}
          {Array.from({ length: 90 }).map((_, i) => {
            const x = 100 + (i * 13) % 1200;
            const y = 140 + Math.sin(i / 3) * 28 + (i % 7) * 6;
            const r = 0.7 + ((i * 37) % 10) / 20;
            const o = 0.15 + ((i * 11) % 10) / 50;
            return <circle key={i} cx={x} cy={y} r={r} fill="var(--brand-primary)" opacity={o} />;
          })}
          {/* Subtle wave lines */}
          <path d="M0 320 C 300 260, 600 380, 900 320 S 1400 300, 1400 300" stroke="var(--brand-primary)" strokeOpacity="0.15" strokeWidth="2" fill="none" />
          <path d="M0 360 C 300 300, 600 420, 900 360 S 1400 340, 1400 340" stroke="var(--brand-primary)" strokeOpacity="0.10" strokeWidth="2" fill="none" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-24 text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
          Transforming Data into Intelligent Decisions
        </h1>
        <p className="mt-4 max-w-2xl mx-auto">
          We help organizations design, build, and operationalize modern analytics and AI capabilities
          that drive measurable business outcomes.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <a
            href="#contact"
            className="px-6 py-3 rounded-md bg-[var(--brand-primary)] text-white font-medium shadow-sm transition-transform duration-200 hover:scale-[1.03]"
          >
            Start Your Project
          </a>
          <a
            href="#services"
            className="px-6 py-3 rounded-md border transition-colors hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
          >
            Explore Services
          </a>
        </div>
      </div>
    </section>
  );
}
