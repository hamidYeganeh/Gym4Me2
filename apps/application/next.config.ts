import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.NEXT_PUBLIC_CAPACITOR_EXPORT === "1" ? "export" : undefined,
  trailingSlash: true,
  transpilePackages: ["@repo/api", "@repo/theme", "@repo/ui"],
};

export default nextConfig;
