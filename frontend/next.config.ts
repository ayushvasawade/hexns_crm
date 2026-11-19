import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const rawBackendUrl = (
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      ""
    ).trim().replace(/\/+$/, "");

    if (!rawBackendUrl) {
      return [];
    }

    const destinationBase = rawBackendUrl.endsWith("/api/v1")
      ? rawBackendUrl
      : rawBackendUrl.endsWith("/api")
      ? `${rawBackendUrl}/v1`
      : `${rawBackendUrl}/api/v1`;

    return [
      {
        source: "/api/v1/:path*",
        destination: `${destinationBase}/:path*`,
      },
    ];
  },
};

export default nextConfig;
