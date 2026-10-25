import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  transpilePackages: ["@repo/i18n", "@repo/theme", "@repo/ui", "@repo/api"],
  async rewrites() {
    const api = (process.env.API_URL ?? "http://localhost:7088").replace(
      /\/$/,
      "",
    );
    return [
      {
        source: "/api/v1/sports/recommendations",
        destination: `${api}/api/v1/sports/recommendations`,
      },
      {
        source: "/api/v1/catalog/:path*",
        destination: `${api}/api/v1/catalog/:path*`,
      },
      {
        source: "/api/v1/profile/account/location",
        destination: `${api}/api/v1/profile/account/location`,
      },
    ];
  },
  turbopack: {
    rules: {
      // Only Tailwind's entry needs this loader. CSS Modules retain their scope.
      "globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
