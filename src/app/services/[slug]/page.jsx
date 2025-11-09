import services from "@/data/services.json" assert { type: "json" };
import details from "@/data/serviceDetails.json" assert { type: "json" };
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
  const detail = details.find((d) => d.slug === slug) || {};
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
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">{service.title}</h1>
          <p className="text-lg md:text-xl max-w-3xl mx-auto opacity-90 leading-relaxed">{service.description}</p>
        </div>
      </section>

      {/* CONTENT SECTION */}
      <main className="max-w-4xl mx-auto px-6 py-16 leading-relaxed text-gray-800">
        {slug === "ai-strategy-and-advisory" && (detail.overview || detail.whyItMatters || detail.howWeWork) ? (
          <>
            {detail.overview && (
              <>
                <h2 className="text-2xl font-bold mb-4">Overview</h2>
                <p className="mb-8">{detail.overview}</p>
              </>
            )}

            {Array.isArray(detail.whyItMatters) && detail.whyItMatters.length > 0 && (
              <>
                <h3 className="text-xl font-semibold mb-3">Why It Matters</h3>
                <ul className="list-disc pl-5 space-y-2 mb-10">
                  {detail.whyItMatters.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </>
            )}

            {Array.isArray(detail.howWeWork) && detail.howWeWork.length > 0 && (
              <>
                <div className="border rounded-lg overflow-hidden mb-6">
                  <div className="bg-gray-900 text-white text-center text-sm tracking-widest py-2">HOW WE WORK</div>
                </div>
                <div className="grid gap-6 md:grid-cols-3">
                  {detail.howWeWork.map((card, idx) => (
                    <div key={idx} className="rounded border p-5">
                      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-indigo-600/10 text-indigo-700">
                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16M12 4v16"/></svg>
                      </div>
                      <h4 className="font-semibold">{card.title}</h4>
                      <p className="text-sm text-gray-700 mt-2">{card.text}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        ) : null}

        {slug === "data-and-analytics-strategy" && (detail.whyItMattersIntro || detail.howWeBuild) ? (
          <>
            <h2 className="text-2xl font-bold mb-4">Why It Matters</h2>
            {detail.whyItMattersIntro && <p className="mb-4">{detail.whyItMattersIntro}</p>}
            {detail.whyItMattersSummary && <p className="mb-8">{detail.whyItMattersSummary}</p>}

            <div className="border rounded-lg overflow-hidden mb-6">
              <div className="bg-gray-900 text-white text-center text-sm tracking-widest py-2">HOW WE BUILD DATA STRATEGY</div>
            </div>

            {Array.isArray(detail.howWeBuild) && detail.howWeBuild.length > 0 && (
              <div className="grid gap-6 md:grid-cols-3">
                {detail.howWeBuild.map((card, idx) => (
                  <div key={idx} className="rounded border p-5">
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-indigo-600/10 text-indigo-700">
                      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16M12 4v16"/></svg>
                    </div>
                    <h4 className="font-semibold">{card.title}</h4>
                    <p className="text-sm text-gray-700 mt-2">{card.text}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}

        {/* Back to Services */}
        <Link
          href="/services"
          className="inline-block mt-12 text-blue-600 hover:text-blue-800 font-semibold"
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
