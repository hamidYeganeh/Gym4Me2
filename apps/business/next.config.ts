import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  ...(process.env.GYM_STAGING_WEB === "true"
    ? {
        distDir: ".next-staging",
        typescript: { tsconfigPath: "tsconfig.staging.json" },
      }
    : {}),
  transpilePackages: ["@repo/ui", "@repo/theme", "@repo/i18n", "@repo/api"],
  turbopack: {
    rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } },
  },
  webpack(config) {
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
