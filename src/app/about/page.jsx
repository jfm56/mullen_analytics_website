import Image from 'next/image';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="max-w-6xl mx-auto py-16 px-4">
      <h1 className="text-4xl font-extrabold text-black">About Mullen Analytics & AI Consulting</h1>
      <p className="mt-2 text-black">Founder · Data Scientist · AI & Analytics Consultant</p>
      <div className="h-6" />
      <div className="grid md:grid-cols-5 gap-10 items-start">
        <div className="md:col-span-2">
          <div className="relative w-full aspect-[4/5] overflow-hidden rounded-xl border bg-white">
            <Image
              src="/head-shot.jpeg"
              alt="Headshot of founder, Mullen"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
        <div className="md:col-span-3">
          <h2 className="text-2xl font-bold text-black mb-4">Why I Started Mullen Analytics</h2>
          <p className="text-black leading-relaxed mb-4">
            My goal is to bring data-driven decision-making into the world. As a veteran and former paramedic,
            service has always been central to who I am. At Mullen Analytics, we help guide data-driven decisions
            across genetics, business strategy, environmental science, and more.
          </p>
          <p className="text-black leading-relaxed mb-6">
            We take pride in helping our clients understand both the data and the results — empowering them to act
            with clarity, confidence, and purpose.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/portfolio" className="inline-flex items-center gap-2 px-5 py-3 rounded-md border hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-colors">
              → View Case Studies
            </Link>
            <Link href="/#contact" className="inline-flex items-center gap-2 px-5 py-3 rounded-md bg-[var(--brand-primary)] text-white hover:opacity-90 transition-opacity">
              → Schedule a Free Consultation
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
