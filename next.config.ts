import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return ['/admin/:path*', '/portal/:path*', '/signup'].map((source) => ({
      source,
      headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
    }));
  },
  async redirects() {
    return [
      {
        source: "/platform",
        destination: "/admin",
        permanent: true,
      },
      {
        source: "/platform/:path*",
        destination: "/admin",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
