import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nativeExport = process.env.NEXT_PUBLIC_NATIVE_EXPORT === "true";

const nextConfig: NextConfig = {
  ...(nativeExport
    ? {
        output: "export",
        distDir: ".next-native",
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
  transpilePackages: ["@repo/ui", "@repo/theme", "@repo/i18n"],
  turbopack: {
    rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } },
  },
  ...(!nativeExport
    ? {
        async rewrites() {
          return [
            {
              source: "/api/:path*",
              destination: `${(process.env.API_URL ?? "http://localhost:7088").replace(/\/$/, "")}/api/:path*`,
            },
          ];
        },
      }
    : {}),
};
export default createNextIntlPlugin("./i18n/request.ts")(nextConfig);
