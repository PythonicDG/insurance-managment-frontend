import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        // Django routes require a trailing slash. Next.js otherwise normalizes
        // the wildcard path and drops it when proxying to an external server.
        destination: "http://127.0.0.1:8000/api/:path*/",
      },
    ];
  },
};

export default nextConfig;
