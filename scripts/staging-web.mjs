import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const root = fileURLToPath(new URL("..", import.meta.url));
const [action, app, ...extra] = process.argv.slice(2);
const ports = {
  application: [7281, 7181],
  admin: [7282, 7182],
  business: [7283, 7183],
};
if (
  !["build", "start"].includes(action) ||
  !Object.hasOwn(ports, app) ||
  extra.length
)
  throw new Error("Use build|start application|admin|business.");
const cwd = resolve(root, "apps", app);
const next = createRequire(resolve(cwd, "package.json")).resolve(
  "next/dist/bin/next",
);
const env = {
  ...process.env,
  NODE_ENV: "production",
  GYM_STAGING_WEB: "true",
  API_URL: "http://127.0.0.1:7188",
  NEXT_PUBLIC_NATIVE_EXPORT: "false",
  NEXT_PUBLIC_API_URL: "/api/v1",
  NEXT_PUBLIC_SITE_URL: `https://localhost:${ports[app][1]}`,
  NEXT_TELEMETRY_DISABLED: "1",
};
const args =
  action === "build"
    ? ["build", "--webpack"]
    : ["start", "--hostname", "127.0.0.1", "--port", String(ports[app][0])];
const result = spawnSync(process.execPath, [next, ...args], {
  cwd,
  env,
  stdio: "inherit",
});
process.exitCode = result.status ?? 1;
