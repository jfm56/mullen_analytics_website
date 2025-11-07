import services from "@/data/services.json" assert { type: "json" };
import Link from "next/link";

const icons = {
  "ai-strategy-and-advisory": (
    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  ),
  "data-and-analytics-strategy": (
    <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 3h18v4H3zM3 10h12v4H3zM3 17h6v4H3z" />
    </svg>
  ),
  "data-engineering-and-modern-data-infrastructure": (
    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  "business-intelligence-and-decision-intelligence": (
    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7l7 5-7 5z" />
    </svg>
  ),
  "machine-learning-and-predictive-modeling": (
    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  // fallback icon if slug not in map
  _default: (
    <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" />
    </svg>
  ),
};

export default async function ServicePage({ params }) {
  const { slug } = await params;
  const service = services.find((s) => s.slug === slug);
  if (!service) return <div className="p-10 text-center text-xl">Service not found</div>;

  const Icon = icons[service.slug] ?? icons._default;

  return (
    <>
      {/* HERO SECTION */}
      <section className="bg-gradient-to-br from-indigo-600 to-blue-600 text-white py-24">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-white/20 rounded-xl backdrop-blur-md">
              {Icon}
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
            {service.title}
          </h1>
          <p className="text-lg md:text-xl max-w-3xl mx-auto opacity-90 leading-relaxed">
            {service.description}
          </p>
        </div>
      </section>

      {/* CONTENT SECTION */}
      <main className="max-w-4xl mx-auto px-6 py-16 leading-relaxed text-gray-800">
        <h2 className="text-2xl font-bold mb-4">Overview</h2>
        <p className="mb-8">
          {/* Placeholder for future long-form content — can be replaced with serviceDetails.json */}
          We help organizations apply this capability in a practical, scalable, and measurable way. 
          This service is tailored to your business needs and operational environment.
        </p>

        {/* Back to Services */}
        <Link
          href="/services"
          className="inline-block mt-8 text-blue-600 hover:text-blue-800 font-semibold"
        >
          ← Back to Services
        </Link>
      </main>
    </>
  );
}

export async function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}
