import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import net from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { spawnManaged } from "./managed-child.mjs";
import { privateConfig } from "./staging-backup.mjs";
import { probe } from "./staging-monitor.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
export const stagingServices = [
  "infrastructure",
  "api",
  "application",
  "admin",
  "business",
  "proxy",
];
const ports = {
  application: [7281, 7181],
  admin: [7282, 7182],
  business: [7283, 7183],
};

/** Readiness is bounded and abortable; a failed attempt never authorizes startup. */
export async function waitForReady(
  check,
  { signal, timeoutMs = 120000, intervalMs = 1000 } = {},
) {
  const deadline = AbortSignal.timeout(timeoutMs);
  const pending = signal ? AbortSignal.any([signal, deadline]) : deadline;
  for (;;) {
    pending.throwIfAborted();
    if (await check(pending)) {
      pending.throwIfAborted();
      return;
    }
    await delay(intervalMs, undefined, { signal: pending });
  }
}

function listening(port, signal) {
  return new Promise((done) => {
    const socket = net.connect({ host: "127.0.0.1", port, signal });
    const finish = (ok) => {
      socket.destroy();
      done(ok);
    };
    socket.setTimeout(1000, () => finish(false));
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
  });
}

function httpReady(port, path, signal, health = false) {
  return new Promise((done) => {
    const request = http.get(
      {
        hostname: "127.0.0.1",
        port,
        path,
        signal: AbortSignal.any([signal, AbortSignal.timeout(3000)]),
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
          if (
            !health &&
            response.statusCode === 200 &&
            /<html[\s>]/i.test(body)
          ) {
            done(true);
            response.destroy();
            return;
          }
          if (body.length > 65536) request.destroy();
        });
        response.on("error", () => done(false));
        response.on("end", () => {
          try {
            const value = health ? JSON.parse(body) : null;
            done(
              response.statusCode === 200 &&
                (health
                  ? value.status === "ok" &&
                    value.service === "gym4me-api" &&
                    value.checks?.database === "up" &&
                    value.checks?.storage === "up"
                  : /<html[\s>]/i.test(body)),
            );
          } catch {
            done(false);
          }
        });
      },
    );
    request.on("error", () => done(false));
  });
}

export function stagingApiEnvironment(directory, inherited = process.env) {
  const environment = {
    ...inherited,
    ...privateConfig(resolve(directory, ".env.staging")),
  };
  const database = new URL(environment.DATABASE_URL);
  const storage = new URL(environment.S3_ENDPOINT);
  if (
    !["localhost", "127.0.0.1"].includes(database.hostname) ||
    database.port !== "55434" ||
    database.pathname !== "/gym4me_stage" ||
    decodeURIComponent(database.username) !== "gym4me_runtime" ||
    !["localhost", "127.0.0.1"].includes(storage.hostname) ||
    storage.port !== "8334" ||
    storage.protocol !== "http:"
  )
    throw new Error(
      "Supervisor requires isolated loopback staging dependencies.",
    );
  const sms = resolve(directory, "apps/api/.env");
  if (existsSync(sms)) {
    const settings = privateConfig(sms);
    for (const name of ["KAVENEGAR_API_KEY", "KAVENEGAR_ANDROID_APP_HASH"])
      if (settings[name]) environment[name] = settings[name];
  }
  for (const name of [
    "MIGRATION_DATABASE_URL",
    "STAGE_ADMIN_PASSWORD",
    "STAGE_MIGRATION_PASSWORD",
    "STAGE_RUNTIME_PASSWORD",
  ])
    delete environment[name];
  return {
    ...environment,
    NODE_ENV: "production",
    API_HOST: "127.0.0.1",
    PORT: "7188",
  };
}

/** Run prebuilt services only. Generation/startup never builds, migrates or installs anything. */
export async function runStagingService(
  name,
  { signal, directory = root } = {},
) {
  if (!stagingServices.includes(name))
    throw new Error("Unknown staging service.");
  const controller = new AbortController();
  const active = signal
    ? AbortSignal.any([signal, controller.signal])
    : controller.signal;
  let task;
  try {
    let args,
      cwd = directory,
      env = process.env,
      ready;
    if (name === "infrastructure") {
      // Compose retains its existing named volumes and restart policies.
      privateConfig(resolve(directory, ".env.staging"));
      env = { ...process.env };
      for (const key of [
        "STAGE_ADMIN_PASSWORD",
        "STAGE_MIGRATION_PASSWORD",
        "STAGE_RUNTIME_PASSWORD",
        "S3_ACCESS_KEY_ID",
        "S3_SECRET_ACCESS_KEY",
      ])
        delete env[key];
      task = spawnManaged(
        "docker",
        [
          "compose",
          "-f",
          "compose.staging.yaml",
          "--env-file",
          ".env.staging",
          "up",
          "-d",
          "--wait",
          "--wait-timeout",
          "120",
        ],
        { cwd, env, stdio: "inherit" },
        { signal: active, timeoutMs: 150000 },
      );
      const { code } = await task.completed;
      if (code !== 0) throw new Error("Staging infrastructure unavailable.");
      return;
    }
    if (name === "api") {
      env = stagingApiEnvironment(directory);
      cwd = resolve(directory, "apps/api");
      if (!existsSync(resolve(cwd, "dist/main.js")))
        throw new Error("Build the API before supervising it.");
      await waitForReady(
        async (pending) =>
          (
            await Promise.all([
              listening(55434, pending),
              listening(8334, pending),
            ])
          ).every(Boolean),
        { signal: active },
      );
      args = [resolve(cwd, "dist/main.js")];
      ready = (pending) =>
        httpReady(7188, "/api/v1/system/health/ready", pending, true);
    } else if (Object.hasOwn(ports, name)) {
      cwd = resolve(directory, "apps", name);
      if (!existsSync(resolve(cwd, ".next-staging/BUILD_ID")))
        throw new Error(
          "Build the staging web application before supervising it.",
        );
      const next = createRequire(resolve(cwd, "package.json")).resolve(
        "next/dist/bin/next",
      );
      env = {
        ...process.env,
        NODE_ENV: "production",
        GYM_STAGING_WEB: "true",
        API_URL: "http://127.0.0.1:7188",
        NEXT_PUBLIC_NATIVE_EXPORT: "false",
        NEXT_PUBLIC_API_URL: "/api/v1",
        NEXT_PUBLIC_SITE_URL: `https://localhost:${ports[name][1]}`,
        NEXT_TELEMETRY_DISABLED: "1",
      };
      await waitForReady(
        (pending) =>
          httpReady(7188, "/api/v1/system/health/ready", pending, true),
        { signal: active },
      );
      args = [
        next,
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(ports[name][0]),
      ];
      ready = (pending) => httpReady(ports[name][0], "/login", pending);
    } else {
      for (const file of ["server.key", "server.crt", "ca.crt"])
        if (!existsSync(resolve(directory, ".staging-tls", file)))
          throw new Error(
            "Create staging TLS material before supervising its proxy.",
          );
      await waitForReady(
        async (pending) =>
          (
            await Promise.all([
              httpReady(7188, "/api/v1/system/health/ready", pending, true),
              ...Object.values(ports).map(([port]) =>
                httpReady(port, "/login", pending),
              ),
            ])
          ).every(Boolean),
        { signal: active },
      );
      args = [resolve(directory, "scripts/staging-proxy.mjs")];
      const ca = readFileSync(resolve(directory, ".staging-tls/ca.crt"));
      ready = async (pending) =>
        (
          await Promise.all(
            [7443, 7181, 7182, 7183].map((port) =>
              probe(port, ca, 3000, pending),
            ),
          )
        ).every(Boolean);
    }
    task = spawnManaged(
      process.execPath,
      args,
      { cwd, env, stdio: "inherit" },
      { signal: active, graceMs: 15000 },
    );
    if (ready)
      await Promise.race([
        waitForReady(ready, { signal: active }),
        task.completed.then(() => {
          throw new Error("Staging process exited before readiness.");
        }),
      ]);
    console.log(`Staging ${name} started${ready ? " and ready" : ""}.`);
    const { code } = await task.completed;
    if (code !== 0) throw new Error("Staging process exited unsuccessfully.");
  } finally {
    controller.abort();
    if (task) await task.stop().catch(() => {});
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  try {
    if (process.argv.length !== 3)
      throw new Error("Use one staging service name.");
    await runStagingService(process.argv[2], { signal: controller.signal });
  } catch {
    if (!controller.signal.aborted) {
      console.error(
        "Staging service failed; inspect its private configuration, build and dependencies.",
      );
      process.exitCode = 1;
    }
  } finally {
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
  }
}
