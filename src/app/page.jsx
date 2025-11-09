 import HeroSection from "@/components/HeroSection";
 import SectionHeader from "@/components/SectionHeader";
 import ServiceCard from "@/components/ServiceCard";
 import ContactForm from "@/components/ContactForm";
 import services from "@/data/services.json" assert { type: "json" };
 

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
      {/* How We Help Organizations */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="border rounded-lg overflow-hidden mb-6">
          <div className="bg-gray-900 text-white text-center text-sm tracking-widest py-2">HOW WE HELP ORGANIZATIONS</div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded border p-6">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-indigo-600/10 text-indigo-700">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16M12 4v16"/></svg>
            </div>
            <h4 className="font-semibold">Strategy & Alignment</h4>
            <p className="text-sm text-black mt-2">We clarify business priorities and identify where data and AI can drive meaningful outcomes.</p>
          </div>
          <div className="rounded border p-6">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-indigo-600/10 text-indigo-700">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h12M4 18h8"/></svg>
            </div>
            <h4 className="font-semibold">Data Foundation & Infrastructure</h4>
            <p className="text-sm text-black mt-2">We ensure data is reliable, accessible, and structured for decision-making and scale.</p>
          </div>
          <div className="rounded border p-6">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-indigo-600/10 text-indigo-700">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
            </div>
            <h4 className="font-semibold">Analytics, Intelligence & Automation</h4>
            <p className="text-sm text-black mt-2">We build reporting, models, and workflows that turn data into decisions and action.</p>
          </div>
        </div>
      </section>
      <section id="services" className="max-w-7xl mx-auto px-4 py-16">
        <SectionHeader title="Services" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((s, i) => (
            <ServiceCard
              key={i}
              title={s.title}
              description={s.description}
              href={`/services/${s.slug}`}
            />
          ))}
        </div>
      </section>
      <section id="portfolio" className="max-w-7xl mx-auto px-4 py-16 bg-[var(--color-card)]">
        <SectionHeader title="Selected Work" />
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded border p-6 hover:shadow-sm transition-shadow">
            <h3 className="font-semibold">Case Study 1 — Breast Cancer Diagnosis Decision Tree Model</h3>
            <p className="text-sm text-black mt-2">We developed a fully interpretable machine learning model to support early breast cancer diagnosis by analyzing tumor characteristics. The model was built from scratch and included explainable visual decision rules to support clinical reasoning.</p>
            <p className="text-sm text-black mt-2"><strong>Impact:</strong> Enabled clearer diagnostic decision support and improved model transparency, building confidence for clinical review teams.</p>
          </div>
          <div className="rounded border p-6 hover:shadow-sm transition-shadow">
            <h3 className="font-semibold">Case Study 2 — Weather-Based Precipitation Prediction</h3>
            <p className="text-sm text-black mt-2">We analyzed historical weather data and transformed precipitation type into predictive variables for logistic regression forecasting. The resulting models predicted the likelihood of rain or snow based on environmental conditions and highlighted the strongest driving factors.</p>
            <p className="text-sm text-black mt-2"><strong>Impact:</strong> Increased forecast reliability and improved planning for weather-dependent operations, with fully interpretable feature impact insights.</p>
          </div>
          <div className="rounded border p-6 hover:shadow-sm transition-shadow">
            <h3 className="font-semibold">Case Study 3 — Association Rule Mining for Oncology Feature Patterns</h3>
            <p className="text-sm text-black mt-2">We applied the FP-Growth algorithm to identify co-occurring tumor characteristics associated with malignant cases. While no strong multi-feature patterns emerged—reflecting the complexity of cancer signals—we used the most informative features to train a transparent decision-tree classifier.</p>
            <p className="text-sm text-black mt-2"><strong>Impact:</strong> Strengthened explainability in model-driven diagnosis and improved understanding of feature interactions for medical decision intelligence.</p>
          </div>
        </div>
      </section>
      {/* Testimonials section removed per request */}
      <section id="contact" className="max-w-3xl mx-auto px-4 py-16 bg-[var(--color-footer-bg)] text-[var(--color-footer-text)]">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white text-center mb-8">Tell Us About Your Goals</h2>
        <p className="mb-6 text-white text-center">We look forward to learning about your initiatives and exploring how we can support your data and AI strategy.</p>
        <ContactForm />
      </section>
    </div>
  );
}
