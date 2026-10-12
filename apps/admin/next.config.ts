import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/ui", "@repo/theme", "@repo/i18n"],
  turbopack: {
    rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } },
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${(process.env.API_URL ?? "http://localhost:7088").replace(/\/$/, "")}/api/:path*`,
      },
    ];
  },
};
export default createNextIntlPlugin("./i18n/request.ts")(nextConfig);
