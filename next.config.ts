import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
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
