import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nativeExport = process.env.NEXT_PUBLIC_NATIVE_EXPORT === "true";
const qaWeb = process.env.GYM_QA_WEB === "true";

const nextConfig: NextConfig = {
  ...(process.env.GYM_STAGING_WEB === "true"
    ? {
        distDir: ".next-staging",
        typescript: { tsconfigPath: "tsconfig.staging.json" },
      }
    : {}),
  ...(qaWeb
    ? {
        distDir: ".next-qa",
        experimental: { cpus: 1, webpackMemoryOptimizations: true },
      }
    : {}),
  ...(nativeExport
    ? {
        output: "export",
        distDir: ".next-native",
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
  transpilePackages: ["@repo/ui", "@repo/theme", "@repo/i18n", "@repo/api"],
  turbopack: {
    rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } },
  },
  webpack(config) {
    // Isolated QA builds share a small local disk; do not retain a second cache.
    if (qaWeb) config.cache = false;
    // Process the same Tailwind entry when using Next's Webpack fallback.
    function addTailwind(rule: unknown) {
      if (!rule || typeof rule !== "object") return;
      if ("oneOf" in rule && Array.isArray(rule.oneOf))
        rule.oneOf.forEach(addTailwind);
      if ("rules" in rule && Array.isArray(rule.rules))
        rule.rules.forEach(addTailwind);
      if (
        "use" in rule &&
        Array.isArray(rule.use) &&
        rule.use.some(
          (item: unknown) =>
            item &&
            typeof item === "object" &&
            "loader" in item &&
            typeof item.loader === "string" &&
            item.loader.includes("/postcss-loader/"),
        )
      ) {
        rule.use.push({ loader: require.resolve("@tailwindcss/turbopack") });
      }
    }
    config.module.rules.forEach(addTailwind);
    return config;
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
