import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const appDirectory = fileURLToPath(new URL("..", import.meta.url));
// Read the same production env files as Next before validating the public API URL.
const nextRequire = createRequire(require.resolve("next/package.json"));
nextRequire("@next/env").loadEnvConfig(appDirectory, false);
const endpoint = process.env.NEXT_PUBLIC_API_URL;
if (endpoint) {
  const url = new URL(endpoint);
  if (url.protocol !== "https:")
    throw new Error("Native exports require an HTTPS NEXT_PUBLIC_API_URL.");
} else {
  console.warn(
    "NEXT_PUBLIC_API_URL is unset. Exporting the offline UI; API features stay unavailable until configured.",
  );
}
const result = spawnSync(
  process.execPath,
  [require.resolve("next/dist/bin/next"), "build"],
  {
    stdio: "inherit",
    cwd: appDirectory,
    env: { ...process.env, NEXT_PUBLIC_NATIVE_EXPORT: "true" },
  },
);
process.exit(result.status ?? 1);
