 import HeroSection from "@/components/HeroSection";
 import SectionHeader from "@/components/SectionHeader";
 import ServiceCard from "@/components/ServiceCard";
 import ContactForm from "@/components/ContactForm";
 import services from "@/data/services.json" assert { type: "json" };
 import testimonials from "@/data/testimonials.json" assert { type: "json" };

export default function Home() {
  return (
    <div>
      <HeroSection />
      <section id="about" className="max-w-5xl mx-auto px-4 py-16 bg-[var(--color-card)]">
        <SectionHeader title="Who We Are" />
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <p className="text-black leading-relaxed">
            Mullen Analytics & AI Consulting partners with executives and operational leaders to
            develop data strategies, modernize analytics platforms, and deploy AI responsibly. We
            combine analytical rigor with practical execution to help organizations make confident,
            data-driven decisions at scale.
          </p>
          <div className="rounded-lg border p-6">
            <h3 className="font-semibold mb-3">Focus Areas</h3>
            <ul className="space-y-2 text-sm text-black">
              <li>• AI strategy and operating frameworks</li>
              <li>• Data platform and pipeline modernization</li>
              <li>• Machine learning development and model governance</li>
              <li>• Decision intelligence, reporting, and business analytics</li>
            </ul>
          </div>
        </div>
      </section>
      <section id="services" className="max-w-7xl mx-auto px-4 py-16">
        <SectionHeader title="Services" />
        <div className="grid gap-6 md:grid-cols-3">
          {services.map((s, i) => (
            <ServiceCard key={i} title={s.title} description={s.description} />
          ))}
        </div>
      </section>
      <section id="portfolio" className="max-w-7xl mx-auto px-4 py-16 bg-[var(--color-card)]">
        <SectionHeader title="Selected Work" />
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded border p-6 hover:shadow-sm transition-shadow">
            <h3 className="font-semibold">Case Study 1</h3>
            <p className="text-sm text-black mt-2">We partnered with a client to modernize their analytics platform, streamline data workflows, and improve reporting accuracy.</p>
            <p className="text-sm text-black mt-2"><strong>Impact:</strong> Reduced manual reporting time and enabled faster strategic decision-making.</p>
          </div>
          <div className="rounded border p-6 hover:shadow-sm transition-shadow">
            <h3 className="font-semibold">Case Study 2</h3>
            <p className="text-sm text-black mt-2">We developed and deployed predictive models to support resource planning and operational forecasting.</p>
            <p className="text-sm text-black mt-2"><strong>Impact:</strong> Increased forecast reliability and improved business alignment.</p>
          </div>
          <div className="rounded border p-6 hover:shadow-sm transition-shadow">
            <h3 className="font-semibold">Case Study 3</h3>
            <p className="text-sm text-black mt-2">We implemented data governance and quality controls to support scalable analytics growth.</p>
            <p className="text-sm text-black mt-2"><strong>Impact:</strong> Improved data trust, compliance, and executive confidence.</p>
          </div>
        </div>
      </section>
      <section id="testimonials" className="max-w-5xl mx-auto px-4 py-16">
        <SectionHeader title="What Clients Say" />
        <div className="grid gap-6 md:grid-cols-2">
          {testimonials.map((t, i) => (
            <div key={i} className="rounded border p-6 bg-gray-50">
              <p className="italic">“{t.quote}”</p>
              <p className="mt-3 text-sm text-black">— {t.author}</p>
            </div>
          ))}
        </div>
      </section>
      <section id="contact" className="max-w-3xl mx-auto px-4 py-16 bg-[var(--color-footer-bg)] text-[var(--color-footer-text)]">
        <h2 className="text-3xl md:text-4xl font-extrabold text-[var(--color-footer-text)] text-center mb-8">Tell Us About Your Goals</h2>
        <p className="mb-6 text-[var(--color-footer-text)] text-center">We look forward to learning about your initiatives and exploring how we can support your data and AI strategy.</p>
        <ContactForm />
      </section>
    </div>
  );
}
