import Link from "next/link";

// Standalone "digital business card" landing, reached mainly by QR code.
// Intentionally self-contained (its own dark theme + footer); the global
// light Navbar/Footer are hidden for /connect via HIDE_ROUTES in
// components/ConditionalNavFooter.jsx. Contact info, scheduler, headshot, and
// internal links are wired to this site's real values (see the notes on each).

export const metadata = {
  title: "Connect with Jim Mullen | Mullen Analytics & Data Solutions",
  description:
    "Connect with Mullen Analytics & Data Solutions. View services, projects, capability statement, portfolio, demo, and schedule a consultation.",
  openGraph: {
    title: "Mullen Analytics & Data Solutions",
    description:
      "Turning data into solutions through automation, predictive analytics, dashboards, and decision support.",
    url: "https://mullenanalytics.com/connect",
    siteName: "Mullen Analytics & Data Solutions LLC",
    images: [
      {
        url: "/images/connect-preview.jpg",
        width: 1200,
        height: 630,
        alt: "Mullen Analytics & Data Solutions",
      },
    ],
    type: "website",
  },
};

// Real Google Calendar scheduling link used across the rest of the site.
const CALENDAR_URL = "https://calendar.app.google/1BFgdi2pgjF9vwAB8";

const services = [
  {
    title: "Automation & Decision Support",
    description:
      "Smart tools that automate manual work, review documents, and support better decisions — built around your data.",
  },
  {
    title: "Predictive Analytics",
    description:
      "Forecast staffing, call volume, demand, operational needs, risk, and future performance.",
  },
  {
    title: "Business Intelligence",
    description:
      "Interactive dashboards and reporting systems that transform data into actionable information.",
  },
  {
    title: "Data Engineering",
    description:
      "Data cleaning, integration, database development, ETL pipelines, and reporting automation.",
  },
];

const industries = [
  "Healthcare",
  "EMS and Public Safety",
  "Government and Defense",
  "Small and Mid-Sized Businesses",
  "Research Organizations",
];

const projects = [
  {
    title: "EMS Staffing and Call Forecasting",
    description:
      "Predictive analytics for call volume, staffing needs, response times, overtime, and unit utilization.",
    image: "/images/portfolio-ems.jpg",
    href: "/first-responders",
  },
  {
    title: "Healthcare Operations Analytics",
    description:
      "Dashboards and predictive tools for staffing, clinical operations, quality improvement, and resource planning.",
    image: "/images/portfolio-healthcare.jpg",
    href: "/healthcare",
  },
  {
    title: "Business Intelligence Dashboards",
    description:
      "Custom dashboards that organize operational, financial, customer, and performance data.",
    image: "/images/portfolio-dashboard.jpg",
    href: "/portfolio",
  },
];

export default function ConnectPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Hero and virtual business card */}
      <section className="border-b border-slate-800">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div className="flex flex-col justify-center">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-sky-400">
              Mullen Analytics &amp; Data Solutions LLC
            </p>

            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Turning data into solutions.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              We help healthcare organizations, public safety agencies,
              government organizations, researchers, and businesses make
              better decisions through automation, predictive analytics,
              decision support, and business intelligence.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#schedule"
                className="rounded-lg bg-sky-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-sky-400"
              >
                Schedule a Consultation
              </a>

              <a
                href="/api/vcard"
                className="rounded-lg border border-slate-600 px-5 py-3 font-semibold text-slate-200 transition hover:border-sky-400 hover:text-sky-400"
              >
                Save My Contact
              </a>

              <a
                href="#demo"
                className="rounded-lg border border-slate-600 px-5 py-3 font-semibold text-slate-200 transition hover:border-sky-400 hover:text-sky-400"
              >
                Watch Virtual Demo
              </a>
            </div>
          </div>

          <aside className="rounded-3xl border border-slate-700 bg-slate-900 p-7 shadow-2xl">
            <div className="flex items-center gap-5">
              <img
                src="/head-shot.jpeg"
                alt="Jim Mullen, founder of Mullen Analytics and Data Solutions"
                className="h-24 w-24 rounded-2xl object-cover"
              />

              <div>
                <h2 className="text-2xl font-bold text-white">Jim Mullen, MSDS</h2>
                <p className="mt-1 text-sky-400">
                  Founder and Data Scientist
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Veteran-owned analytics and automation consulting
                </p>
              </div>
            </div>

            <div className="mt-7 space-y-3 border-t border-slate-700 pt-6">
              <a
                href="tel:+16092005818"
                className="block rounded-lg bg-slate-800 px-4 py-3 text-slate-100 hover:bg-slate-700"
              >
                Call: 609-200-5818
              </a>

              <a
                href="mailto:jmullen@mullenanalytics.com"
                className="block rounded-lg bg-slate-800 px-4 py-3 text-slate-100 hover:bg-slate-700"
              >
                Email: jmullen@mullenanalytics.com
              </a>

              <a
                href="https://mullenanalytics.com"
                className="block rounded-lg bg-slate-800 px-4 py-3 text-slate-100 hover:bg-slate-700"
              >
                Website: mullenanalytics.com
              </a>

              <a
                href="/api/vcard"
                className="block rounded-lg bg-sky-500 px-4 py-3 text-center font-semibold text-slate-950 hover:bg-sky-400"
              >
                Add Jim to Contacts
              </a>
            </div>
          </aside>
        </div>
      </section>

      {/* Quick links */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <a
            href="/documents/mullen-analytics-brochure.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-2xl border border-slate-700 bg-slate-900 p-5 transition hover:border-sky-400"
          >
            <p className="font-semibold text-white">Digital Brochure</p>
            <p className="mt-2 text-sm text-slate-400">
              View our services and industries.
            </p>
          </a>

          <a
            href="/documents/mullen-analytics-capability-statement.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-2xl border border-slate-700 bg-slate-900 p-5 transition hover:border-sky-400"
          >
            <p className="font-semibold text-white">Capability Statement</p>
            <p className="mt-2 text-sm text-slate-400">
              Review our capabilities and company information.
            </p>
          </a>

          <a
            href="#portfolio"
            className="rounded-2xl border border-slate-700 bg-slate-900 p-5 transition hover:border-sky-400"
          >
            <p className="font-semibold text-white">Portfolio</p>
            <p className="mt-2 text-sm text-slate-400">
              Explore analytics and automation projects.
            </p>
          </a>

          <a
            href="#schedule"
            className="rounded-2xl border border-slate-700 bg-slate-900 p-5 transition hover:border-sky-400"
          >
            <p className="font-semibold text-white">Book a Meeting</p>
            <p className="mt-2 text-sm text-slate-400">
              Schedule a free initial consultation.
            </p>
          </a>
        </div>
      </section>

      {/* Interactive brochure */}
      <section id="brochure" className="bg-slate-900/50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-sky-400">
              Interactive Brochure
            </p>
            <h2 className="mt-3 text-3xl font-bold text-white">
              Data solutions designed around your organization
            </h2>
            <p className="mt-4 text-lg text-slate-300">
              We design practical analytics and automation systems that help
              organizations improve efficiency, reduce costs, understand
              performance, and plan for the future.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {services.map((service) => (
              <article
                key={service.title}
                className="rounded-2xl border border-slate-700 bg-slate-900 p-6"
              >
                <h3 className="text-xl font-semibold text-white">{service.title}</h3>
                <p className="mt-3 leading-7 text-slate-400">
                  {service.description}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-14">
            <h3 className="text-2xl font-semibold text-white">Industries We Serve</h3>

            <div className="mt-6 flex flex-wrap gap-3">
              {industries.map((industry) => (
                <span
                  key={industry}
                  className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200"
                >
                  {industry}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <a
              href="/documents/mullen-analytics-brochure.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400"
            >
              View Printable Brochure
            </a>

            <a
              href="/documents/mullen-analytics-brochure.pdf"
              download
              className="rounded-lg border border-slate-600 px-5 py-3 font-semibold text-slate-200 hover:border-sky-400 hover:text-sky-400"
            >
              Download Brochure
            </a>
          </div>
        </div>
      </section>

      {/* Capability statement */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid items-center gap-10 rounded-3xl border border-slate-700 bg-slate-900 p-8 lg:grid-cols-2 lg:p-12">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-sky-400">
              Government and Organizational Buyers
            </p>

            <h2 className="mt-3 text-3xl font-bold text-white">
              Capability Statement
            </h2>

            <p className="mt-5 leading-7 text-slate-300">
              Review our core competencies, differentiators, industries,
              technical capabilities, and company information.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="/documents/mullen-analytics-capability-statement.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400"
              >
                View Capability Statement
              </a>

              <a
                href="/documents/mullen-analytics-capability-statement.pdf"
                download
                className="rounded-lg border border-slate-600 px-5 py-3 font-semibold text-slate-200 hover:border-sky-400 hover:text-sky-400"
              >
                Download PDF
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-950 p-7">
            <h3 className="text-lg font-semibold text-white">Core Competencies</h3>
            <ul className="mt-5 space-y-3 text-slate-300">
              <li>Machine learning and automation</li>
              <li>Predictive analytics and forecasting</li>
              <li>Business intelligence dashboards</li>
              <li>Data engineering and integration</li>
              <li>Workflow and reporting automation</li>
              <li>Healthcare and public-safety analytics</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Portfolio */}
      <section id="portfolio" className="bg-slate-900/50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-sky-400">
                Portfolio
              </p>
              <h2 className="mt-3 text-3xl font-bold text-white">
                Examples of our work
              </h2>
            </div>

            <Link
              href="/portfolio"
              className="font-semibold text-sky-400 hover:text-sky-300"
            >
              View Full Portfolio →
            </Link>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {projects.map((project) => (
              <article
                key={project.title}
                className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900"
              >
                <img
                  src={project.image}
                  alt=""
                  className="h-52 w-full object-cover"
                />

                <div className="p-6">
                  <h3 className="text-xl font-semibold text-white">{project.title}</h3>

                  <p className="mt-3 leading-7 text-slate-400">
                    {project.description}
                  </p>

                  <Link
                    href={project.href}
                    className="mt-5 inline-block font-semibold text-sky-400 hover:text-sky-300"
                  >
                    Learn More →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Virtual demo */}
      <section id="demo" className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-sky-400">
            Virtual Demo
          </p>
          <h2 className="mt-3 text-3xl font-bold text-white">
            See our analytics solutions in action
          </h2>
          <p className="mt-4 text-lg text-slate-300">
            Watch a brief overview of our dashboards, forecasting tools, and
            automated analytics capabilities.
          </p>
        </div>

        <div className="mt-10 overflow-hidden rounded-3xl border border-slate-700 bg-black">
          <video
            className="aspect-video w-full"
            controls
            preload="metadata"
            poster="/images/connect-preview.jpg"
          >
            <source
              src="/videos/mullen-analytics-demo.mp4"
              type="video/mp4"
            />
            Your browser does not support embedded video.
          </video>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/portfolio"
            className="rounded-lg bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400"
          >
            Explore Our Work
          </Link>

          <a
            href="mailto:jmullen@mullenanalytics.com?subject=Request%20for%20Mullen%20Analytics%20Demo"
            className="rounded-lg border border-slate-600 px-5 py-3 font-semibold text-slate-200 hover:border-sky-400 hover:text-sky-400"
          >
            Request a Private Demo
          </a>
        </div>
      </section>

      {/* Meeting scheduler */}
      <section id="schedule" className="bg-slate-900/50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-sky-400">
              Free Initial Consultation
            </p>
            <h2 className="mt-3 text-3xl font-bold text-white">
              Schedule a meeting
            </h2>
            <p className="mt-4 text-lg text-slate-300">
              Select a convenient time to discuss your organization, data,
              challenges, and potential solutions.
            </p>
          </div>

          {/* Uses the site's real Google Calendar scheduler. Google blocks
              iframe embedding of these pages, so we link out in a new tab.
              To book inline instead, swap this block for a Calendly/Google
              embed snippet. */}
          <div className="mx-auto mt-10 max-w-2xl rounded-3xl border border-slate-700 bg-slate-900 p-8 text-center sm:p-10">
            <p className="text-lg text-slate-300">
              Pick a time that works for you. We&apos;ll confirm by email so the
              call is useful from the very first minute.
            </p>
            <a
              href={CALENDAR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-block rounded-lg bg-sky-500 px-6 py-3.5 font-semibold text-slate-950 transition hover:bg-sky-400"
            >
              Open the Scheduler
            </a>
            <p className="mt-4 text-sm text-slate-500">
              Opens our secure booking page in a new tab.
            </p>
          </div>
        </div>
      </section>

      {/* Social links */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="rounded-3xl border border-slate-700 bg-slate-900 p-8 text-center lg:p-12">
          <h2 className="text-3xl font-bold text-white">Stay connected</h2>

          <p className="mx-auto mt-4 max-w-2xl text-slate-300">
            Follow Mullen Analytics &amp; Data Solutions for insights on
            automation, healthcare analytics, public safety,
            data management, forecasting, and business intelligence.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="https://www.linkedin.com/in/YOUR-LINKEDIN"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-slate-600 px-5 py-3 font-semibold text-slate-200 hover:border-sky-400 hover:text-sky-400"
            >
              LinkedIn
            </a>

            <a
              href="https://www.linkedin.com/company/YOUR-COMPANY"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-slate-600 px-5 py-3 font-semibold text-slate-200 hover:border-sky-400 hover:text-sky-400"
            >
              Company Page
            </a>

            <a
              href="https://github.com/jfm56"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-slate-600 px-5 py-3 font-semibold text-slate-200 hover:border-sky-400 hover:text-sky-400"
            >
              GitHub
            </a>

            <a
              href="mailto:jmullen@mullenanalytics.com"
              className="rounded-lg bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400"
            >
              Email Jim
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Mullen Analytics &amp; Data Solutions LLC
          </p>

          <div className="flex gap-5">
            <Link href="/privacy" className="text-slate-400 transition hover:text-white">Privacy</Link>
            <Link href="/contact" className="text-slate-400 transition hover:text-white">Contact</Link>
            <a href="/api/vcard" className="text-slate-400 transition hover:text-white">Save Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
