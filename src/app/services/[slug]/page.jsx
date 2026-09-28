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

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const service = services.find((s) => s.slug === slug);
  if (!service) return { title: "Service | Mullen Analytics & Data Solutions" };
  return {
    title: `${service.title} | Mullen Analytics & Data Solutions`,
    description: service.description,
    alternates: { canonical: `/services/${slug}` },
  };
}

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

        {slug === "data-engineering-and-modern-data-infrastructure" ? (
          <>
            <h2 className="text-2xl font-bold mb-4">Overview</h2>
            <p className="mb-8">
              Modern analytics depends on data that is clean, reliable, and accessible. We design and implement data platforms—warehouses, lakehouses, and pipelines—that support scalable reporting, modeling, and automation. Our approach focuses on building systems that are clear, maintainable, and structured for long-term growth, not quick fixes.
            </p>

            <h3 className="text-xl font-semibold mb-3">Why It Matters</h3>
            <p className="mb-8">Reliable analytics begins with reliable data. Strong data infrastructure eliminates rework, reduces confusion, and builds trust across teams.</p>

            <div className="border rounded-lg overflow-hidden mb-6">
              <div className="bg-gray-900 text-white text-center text-sm tracking-widest py-2">HOW WE WORK</div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded border p-5">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-indigo-600/10 text-indigo-700">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h12M4 18h8"/></svg>
                </div>
                <h4 className="font-semibold">Assess Data Landscape & Workflows</h4>
                <p className="text-sm text-gray-700 mt-2">We map how data is collected, stored, transformed, and used today.</p>
              </div>
              <div className="rounded border p-5">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-indigo-600/10 text-indigo-700">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16M12 4v16"/></svg>
                </div>
                <h4 className="font-semibold">Design Modern Architecture & Pipelines</h4>
                <p className="text-sm text-gray-700 mt-2">We architect scalable, secure, and cost-efficient data platforms.</p>
              </div>
              <div className="rounded border p-5">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-indigo-600/10 text-indigo-700">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
                <h4 className="font-semibold">Implement, Document & Enable Teams</h4>
                <p className="text-sm text-gray-700 mt-2">We deploy pipelines, automate data flow, and support internal capability.</p>
              </div>
            </div>
          </>
        ) : null}

        {slug === "business-intelligence-and-decision-intelligence" ? (
          <>
            <h2 className="text-2xl font-bold mb-4">Overview</h2>
            <p className="mb-8">
              We help organizations modernize dashboards, streamline reporting workflows, and build analytical environments where teams can explore data confidently. Our focus is on clarity—defining meaningful KPIs, eliminating redundant reports, and creating self-service analytics that empower decision-makers.
            </p>

            <h3 className="text-xl font-semibold mb-3">Why It Matters</h3>
            <p className="mb-8">Good decisions depend on good information. Clear reporting unlocks speed, alignment, and accountability.</p>

            <div className="border rounded-lg overflow-hidden mb-6">
              <div className="bg-gray-900 text-white text-center text-sm tracking-widest py-2">HOW WE WORK</div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded border p-5">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-indigo-600/10 text-indigo-700">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16M12 4v16"/></svg>
                </div>
                <h4 className="font-semibold">Align KPIs with Business Goals</h4>
                <p className="text-sm text-gray-700 mt-2">We define metrics that reflect real operational priorities.</p>
              </div>
              <div className="rounded border p-5">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-indigo-600/10 text-indigo-700">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h12M4 18h8"/></svg>
                </div>
                <h4 className="font-semibold">Modernize Dashboards & Reporting Workflows</h4>
                <p className="text-sm text-gray-700 mt-2">We replace manual reports with automated, interactive insights.</p>
              </div>
              <div className="rounded border p-5">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-indigo-600/10 text-indigo-700">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
                <h4 className="font-semibold">Enable Self-Service & Data Literacy</h4>
                <p className="text-sm text-gray-700 mt-2">We equip teams to interpret and use insights independently.</p>
              </div>
            </div>
          </>
        ) : null}

        {slug === "machine-learning-and-predictive-modeling" ? (
          <>
            <h2 className="text-2xl font-bold mb-4">Overview</h2>
            <p className="mb-8">
              We design, train, and operationalize predictive models that support forecasting, classification, optimization, and planning. Our focus is always on interpretability, value, and deployment readiness—ensuring models are usable in real workflows, not just technically impressive.
            </p>

            <h3 className="text-xl font-semibold mb-3">Why It Matters</h3>
            <p className="mb-8">Machine learning is most effective when integrated into business processes—not kept in a notebook or lab.</p>

            <div className="border rounded-lg overflow-hidden mb-6">
              <div className="bg-gray-900 text-white text-center text-sm tracking-widest py-2">HOW WE WORK</div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded border p-5">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-indigo-600/10 text-indigo-700">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16M12 4v16"/></svg>
                </div>
                <h4 className="font-semibold">Define Use Case & Success Criteria</h4>
                <p className="text-sm text-gray-700 mt-2">We begin with the business decision the model supports.</p>
              </div>
              <div className="rounded border p-5">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-indigo-600/10 text-indigo-700">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h12M4 18h8"/></svg>
                </div>
                <h4 className="font-semibold">Feature Engineering & Model Development</h4>
                <p className="text-sm text-gray-700 mt-2">We train, validate, and tune transparent, reliable models.</p>
              </div>
              <div className="rounded border p-5">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-indigo-600/10 text-indigo-700">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
                <h4 className="font-semibold">Deployment, Monitoring & Enablement</h4>
                <p className="text-sm text-gray-700 mt-2">We integrate models into workflows and ensure ongoing reliability.</p>
              </div>
            </div>
          </>
        ) : null}

        {slug === "nlp-and-workflow-automation" ? (
          <>
            <h2 className="text-2xl font-bold mb-4">Overview</h2>
            <p className="mb-8">
              We use natural language processing and lightweight automation to reduce manual documentation work, accelerate information retrieval, and route tasks efficiently. The goal is not to replace people—but to remove repetitive effort so teams can focus on higher-value work.
            </p>

            <h3 className="text-xl font-semibold mb-3">Why It Matters</h3>
            <p className="mb-8">Small workflow improvements add up to hours saved every week—reducing burnout and increasing output.</p>

            <div className="border rounded-lg overflow-hidden mb-6">
              <div className="bg-gray-900 text-white text-center text-sm tracking-widest py-2">HOW WE WORK</div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded border p-5">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-indigo-600/10 text-indigo-700">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16M12 4v16"/></svg>
                </div>
                <h4 className="font-semibold">Identify High-Friction Workflows</h4>
                <p className="text-sm text-gray-700 mt-2">We map where time is wasted across documentation and communication.</p>
              </div>
              <div className="rounded border p-5">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-indigo-600/10 text-indigo-700">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h12M4 18h8"/></svg>
                </div>
                <h4 className="font-semibold">Apply NLP + Automation Tools</h4>
                <p className="text-sm text-gray-700 mt-2">We extract key info, summarize text, and automate routing.</p>
              </div>
              <div className="rounded border p-5">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-indigo-600/10 text-indigo-700">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
                <h4 className="font-semibold">Monitor, Iterate, and Train Teams</h4>
                <p className="text-sm text-gray-700 mt-2">We ensure workflows stay aligned to operational needs.</p>
              </div>
            </div>
          </>
        ) : null}

        {slug === "healthcare-and-life-sciences-analytics" ? (
          <>
            <h2 className="text-2xl font-bold mb-4">Overview</h2>
            <p className="mb-8">
              We help healthcare organizations use data to improve operational efficiency, patient outcomes, and resource planning. Our work supports clinical decision-making, performance improvement, and strategic planning—grounded in domain experience and practical execution.
            </p>

            <h3 className="text-xl font-semibold mb-3">Why It Matters</h3>
            <p className="mb-8">Healthcare is complex. Clear analytics create insight, alignment, and better care delivery.</p>

            <div className="border rounded-lg overflow-hidden mb-6">
              <div className="bg-gray-900 text-white text-center text-sm tracking-widest py-2">HOW WE WORK</div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded border p-5">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-indigo-600/10 text-indigo-700">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16M12 4v16"/></svg>
                </div>
                <h4 className="font-semibold">Identify Key Clinical & Operational Measures</h4>
                <p className="text-sm text-gray-700 mt-2">We define the metrics that matter for outcomes and performance.</p>
              </div>
              <div className="rounded border p-5">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-indigo-600/10 text-indigo-700">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h12M4 18h8"/></svg>
                </div>
                <h4 className="font-semibold">Build Clean, Trusted Clinical Data Views</h4>
                <p className="text-sm text-gray-700 mt-2">We unify and prepare data across EHR, EMS, lab, and operational systems.</p>
              </div>
              <div className="rounded border p-5">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-indigo-600/10 text-indigo-700">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
                <h4 className="font-semibold">Deliver Dashboards, Risk Models & Planning Tools</h4>
                <p className="text-sm text-gray-700 mt-2">We support decision-making at clinical, operational, and leadership levels.</p>
              </div>
            </div>
          </>
        ) : null}

        {slug === "product-and-mvp-development" ? (
          <>
            <h2 className="text-2xl font-bold mb-4">Overview</h2>
            <p className="mb-8">
              We help organizations rapidly prototype, test, and validate data-driven products and internal tools. Our goal is to move from idea → working product quickly and cost-effectively, without over-engineering.
            </p>

            <h3 className="text-xl font-semibold mb-3">Why It Matters</h3>
            <p className="mb-8">Speed to learning is more valuable than perfection. Small, working products beat large, theoretical plans.</p>

            <div className="border rounded-lg overflow-hidden mb-6">
              <div className="bg-gray-900 text-white text-center text-sm tracking-widest py-2">HOW WE WORK</div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded border p-5">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-indigo-600/10 text-indigo-700">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16M12 4v16"/></svg>
                </div>
                <h4 className="font-semibold">Define the Core Problem & User Needs</h4>
                <p className="text-sm text-gray-700 mt-2">We clarify what the product must solve immediately.</p>
              </div>
              <div className="rounded border p-5">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-indigo-600/10 text-indigo-700">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h12M4 18h8"/></svg>
                </div>
                <h4 className="font-semibold">Build a Lightweight, Functional MVP</h4>
                <p className="text-sm text-gray-700 mt-2">We implement only what delivers value fast.</p>
              </div>
              <div className="rounded border p-5">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-indigo-600/10 text-indigo-700">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
                <h4 className="font-semibold">Iterate Based on Feedback & Real Usage</h4>
                <p className="text-sm text-gray-700 mt-2">We refine functionality using real operational insights.</p>
              </div>
            </div>
          </>
        ) : null}

        {slug === "training-and-capability-building" ? (
          <>
            <h2 className="text-2xl font-bold mb-4">Overview</h2>
            <p className="mb-8">
              We develop data and analytics skills across teams through workshops, coaching, and hands-on learning. We focus on confidence, clarity, and practical problem-solving—not abstract theory.
            </p>

            <h3 className="text-xl font-semibold mb-3">Why It Matters</h3>
            <p className="mb-8">Tools don’t create value—people do. Empowered teams accelerate progress.</p>

            <div className="border rounded-lg overflow-hidden mb-6">
              <div className="bg-gray-900 text-white text-center text-sm tracking-widest py-2">HOW WE WORK</div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded border p-5">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-indigo-600/10 text-indigo-700">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16M12 4v16"/></svg>
                </div>
                <h4 className="font-semibold">Assess Skill Levels & Learning Goals</h4>
                <p className="text-sm text-gray-700 mt-2">We meet teams where they are.</p>
              </div>
              <div className="rounded border p-5">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-indigo-600/10 text-indigo-700">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h12M4 18h8"/></svg>
                </div>
                <h4 className="font-semibold">Develop Hands-On, Applied Curriculum</h4>
                <p className="text-sm text-gray-700 mt-2">We teach through real examples tied to your operations.</p>
              </div>
              <div className="rounded border p-5">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-indigo-600/10 text-indigo-700">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
                <h4 className="font-semibold">Support Retention & Practice</h4>
                <p className="text-sm text-gray-700 mt-2">We reinforce with guidance, playbooks, and follow-up sessions.</p>
              </div>
            </div>
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
