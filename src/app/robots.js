const BASE = "https://mullenanalytics.com";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private app surfaces and API routes shouldn't be crawled or indexed.
        disallow: ["/admin/", "/portal/", "/api/", "/signup"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
