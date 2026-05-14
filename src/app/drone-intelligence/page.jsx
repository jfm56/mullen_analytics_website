import Image from "next/image";
import Link from "next/link";

export default function DroneIntelligencePage() {
  return (
    <main className="bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100">

      {/* HERO */}
      <section className="relative h-[70vh] min-h-[500px] overflow-hidden">
        <Image
          src="/drone/hero_section1.jpg"
          alt="Drone Intelligence Hero"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative z-10 flex h-full items-center justify-center px-6 text-center">
          <div className="max-w-4xl text-white">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Drone Intelligence
            </h1>
            <p className="text-lg md:text-2xl mb-8">
              Advanced drone technology, AI, thermal imaging, LiDAR, and analytics
              to help organizations collect better data, improve safety, and make faster decisions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="rounded-xl bg-white text-black px-6 py-3 font-semibold hover:bg-gray-200 transition"
              >
                Get a Quote
              </Link>
              <Link
                href="/services"
                className="rounded-xl border border-white px-6 py-3 font-semibold hover:bg-white hover:text-black transition"
              >
                View Services
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT IT IS */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              What Drone Intelligence Is
            </h2>
            <p className="text-lg leading-8 mb-4">
              Drone technology is no longer just aerial photography. It is a powerful
              data collection platform that gives organizations a faster, safer, and
              more detailed way to inspect, map, monitor, and analyze the world around them.
            </p>
            <p className="text-lg leading-8 mb-4">
              At Mullen Analytics, we combine drone operations with AI, analytics,
              thermal imaging, and LiDAR visualization to turn raw imagery into useful,
              decision-ready intelligence.
            </p>
            <p className="text-lg leading-8">
              That means you are not just getting images. You are getting measurable
              insights, better reporting, and a new way to understand your data.
            </p>
          </div>
          <div className="relative h-[400px] rounded-2xl overflow-hidden shadow-lg">
            <Image
              src="/drone/analytics1.jpg"
              alt="Drone analytics visualization"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* HOW IT IMPROVES RESULTS */}
      <section className="bg-gray-50 dark:bg-slate-800 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            How Drone Technology Improves Results
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-700 rounded-2xl shadow-md p-6">
              <h3 className="text-xl font-bold mb-3">Faster Collection</h3>
              <p className="leading-7">
                Capture site, infrastructure, or property data in minutes instead of hours or days.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-700 rounded-2xl shadow-md p-6">
              <h3 className="text-xl font-bold mb-3">Improved Safety</h3>
              <p className="leading-7">
                Reduce the need for climbing, manual inspection, and exposure to hazardous areas.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-700 rounded-2xl shadow-md p-6">
              <h3 className="text-xl font-bold mb-3">Better Accuracy</h3>
              <p className="leading-7">
                Use high-resolution imaging, thermal detection, and LiDAR mapping for more precise analysis.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-700 rounded-2xl shadow-md p-6">
              <h3 className="text-xl font-bold mb-3">Smarter Decisions</h3>
              <p className="leading-7">
                Combine AI and analytics to identify trends, issues, and opportunities faster.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* INDUSTRIES */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Who We Work With
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="rounded-2xl border dark:border-slate-600 p-6 shadow-sm bg-white dark:bg-slate-800">
              <h3 className="text-xl font-bold mb-3">First Responders</h3>
              <p className="leading-7">
                Search and rescue, disaster response, thermal victim detection, scene awareness,
                and rapid aerial assessment.
              </p>
            </div>

            <div className="rounded-2xl border dark:border-slate-600 p-6 shadow-sm bg-white dark:bg-slate-800">
              <h3 className="text-xl font-bold mb-3">Construction Companies</h3>
              <p className="leading-7">
                Site progress tracking, safety documentation, visual reporting, volumetrics,
                and project monitoring.
              </p>
            </div>

            <div className="rounded-2xl border dark:border-slate-600 p-6 shadow-sm bg-white dark:bg-slate-800">
              <h3 className="text-xl font-bold mb-3">3D Mapping & Site Survey</h3>
              <p className="leading-7">
                LiDAR mapping, terrain modeling, topographic views, digital twins,
                and accurate site visualization.
              </p>
            </div>

            <div className="rounded-2xl border dark:border-slate-600 p-6 shadow-sm bg-white dark:bg-slate-800">
              <h3 className="text-xl font-bold mb-3">Insurance Companies</h3>
              <p className="leading-7">
                Roof inspections, storm damage documentation, property analysis,
                and claims support.
              </p>
            </div>

            <div className="rounded-2xl border dark:border-slate-600 p-6 shadow-sm bg-white dark:bg-slate-800">
              <h3 className="text-xl font-bold mb-3">Electric & Utility Companies</h3>
              <p className="leading-7">
                Power line inspections, vegetation monitoring, thermal hotspot detection,
                and infrastructure reviews.
              </p>
            </div>

            <div className="rounded-2xl border dark:border-slate-600 p-6 shadow-sm bg-white dark:bg-slate-800">
              <h3 className="text-xl font-bold mb-3">Environmental & Land Use Projects</h3>
              <p className="leading-7">
                Land monitoring, habitat review, terrain understanding, and data collection
                for environmental analysis.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ANALYTICS LEVELS */}
      <section className="bg-gray-50 dark:bg-slate-800 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-6">
            Levels of Analytics
          </h2>
          <p className="text-center text-lg max-w-3xl mx-auto mb-12">
            We can deliver everything from simple aerial capture to advanced AI-driven analysis.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-700 rounded-2xl shadow-md p-6">
              <h3 className="text-xl font-bold mb-3">Level 1: Data Capture</h3>
              <p className="leading-7">
                Raw aerial photos, video, and visual documentation for basic project visibility.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-700 rounded-2xl shadow-md p-6">
              <h3 className="text-xl font-bold mb-3">Level 2: Processed Insights</h3>
              <p className="leading-7">
                Organized deliverables, marked-up visuals, measurements, and structured reporting.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-700 rounded-2xl shadow-md p-6">
              <h3 className="text-xl font-bold mb-3">Level 3: AI Analytics</h3>
              <p className="leading-7">
                AI-assisted analysis to detect patterns, identify issues, and improve operational decisions.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-700 rounded-2xl shadow-md p-6">
              <h3 className="text-xl font-bold mb-3">Level 4: Predictive Intelligence</h3>
              <p className="leading-7">
                Advanced modeling and trend analysis for future-focused monitoring and decision support.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* THERMAL & LIDAR */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div className="relative h-[400px] rounded-2xl overflow-hidden shadow-lg">
            <Image
              src="/drone/thermal_and_lidar1.jpg"
              alt="Thermal and LiDAR drone visualization"
              fill
              className="object-cover"
            />
          </div>

          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Thermal & LiDAR Visualization
            </h2>
            <p className="text-lg leading-8 mb-4">
              We offer thermal imaging and LiDAR-based visualization to provide a deeper level of insight
              than standard photography alone.
            </p>
            <p className="text-lg leading-8 mb-4">
              Thermal imaging can help detect heat signatures, electrical hotspots, hidden issues,
              and energy-related anomalies.
            </p>
            <p className="text-lg leading-8">
              LiDAR visualization allows for highly detailed 3D mapping, terrain models,
              elevation views, and more advanced site understanding.
            </p>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="bg-gray-50 dark:bg-slate-800 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-6">
            Introductory Pricing
          </h2>
          <p className="text-center text-lg max-w-3xl mx-auto mb-12">
            Since we are expanding our drone services, our pricing is currently positioned
            at the lower end of the market to help organizations get started with this technology.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-700 rounded-2xl shadow-md p-8 text-center">
              <h3 className="text-2xl font-bold mb-4">Basic Capture</h3>
              <p className="text-3xl font-bold mb-4">$150 - $300</p>
              <p className="leading-7">
                Aerial photo and video capture for small sites, basic documentation, and visual updates.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-700 rounded-2xl shadow-md p-8 text-center">
              <h3 className="text-2xl font-bold mb-4">Standard Inspection</h3>
              <p className="text-3xl font-bold mb-4">$300 - $750</p>
              <p className="leading-7">
                Includes processed imagery, basic analysis, organized deliverables, and reporting.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-700 rounded-2xl shadow-md p-8 text-center">
              <h3 className="text-2xl font-bold mb-4">Advanced Analytics</h3>
              <p className="text-3xl font-bold mb-4">$750 - $2,000+</p>
              <p className="leading-7">
                Includes thermal or LiDAR visualization, deeper analysis, and AI-powered insights.
              </p>
            </div>
          </div>

          <div className="mt-10 text-center text-lg">
            Custom quotes available for utilities, insurance, municipalities, emergency response,
            and ongoing analytics support.
          </div>
        </div>
      </section>

      {/* WHY IT CHANGES HOW THEY VIEW DATA */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              How Drone Tech + AI Changes How You View Data
            </h2>
            <p className="text-lg leading-8 mb-4">
              Traditional inspection and reporting methods often rely on limited views,
              delayed reporting, and manual processes.
            </p>
            <p className="text-lg leading-8 mb-4">
              By combining drone technology with AI and analytics, organizations can move
              from simple observation to intelligent analysis.
            </p>
            <p className="text-lg leading-8">
              That means faster decisions, clearer visibility, better documentation,
              and a stronger understanding of operational or environmental conditions.
            </p>
          </div>
          <div className="relative h-[400px] rounded-2xl overflow-hidden shadow-lg">
            <Image
              src="/drone/How_to_improve1.jpg"
              alt="How drone technology improves data understanding"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 px-6 overflow-hidden">
        <Image
          src="/drone/CTA1.jpg"
          alt="Drone call to action background"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 max-w-4xl mx-auto text-center text-white">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ready to Upgrade How You Collect and Understand Data?
          </h2>
          <p className="text-lg md:text-xl mb-8">
            Let's build a drone, AI, and analytics solution for your organization.
          </p>
          <Link
            href="/contact"
            className="inline-block rounded-xl bg-white text-black px-8 py-4 font-semibold hover:bg-gray-200 transition"
          >
            Request a Quote
          </Link>
        </div>
      </section>
    </main>
  );
}
