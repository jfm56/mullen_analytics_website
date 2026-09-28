import services from "@/data/services.json" assert { type: "json" };

const BASE = "https://mullenanalytics.com";

// Public, indexable routes (admin/portal/api/auth are intentionally excluded).
const STATIC_ROUTES = [
  "", "/about", "/capabilities", "/technology", "/industries", "/services",
  "/products", "/pricing", "/portfolio", "/connect", "/contact",
  "/business-analytics", "/healthcare", "/first-responders", "/ems-qa",
  "/biomedical-research", "/drone-intelligence", "/environmental",
  "/business-dashboard-example", "/guides/data-science-vs-data-engineering",
  "/free-assessments", "/free-assessments/business", "/free-assessments/ems",
  "/revenue-checker", "/profit-calculator", "/sample-report", "/privacy",
];

// Conversion-priority pages get a higher weight so crawlers favor them.
const HIGH_PRIORITY = new Set([
  "/free-assessments", "/free-assessments/business", "/free-assessments/ems",
  "/revenue-checker", "/profit-calculator", "/sample-report",
]);

export default function sitemap() {
  const now = new Date();
  const pages = STATIC_ROUTES.map((path) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1.0 : HIGH_PRIORITY.has(path) ? 0.9 : 0.7,
  }));
  const servicePages = services.map((s) => ({
    url: `${BASE}/services/${s.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));
  return [...pages, ...servicePages];
}
