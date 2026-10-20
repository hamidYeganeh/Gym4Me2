import { enqueueAlert, deliverAlerts } from "./monitor-alerts.mjs";
import { privateConfig } from "./staging-backup.mjs";
import { backupHealth } from "./operations-worker.mjs";
import https from "node:https";
import {
  readFileSync,
  mkdirSync,
  writeFileSync,
  renameSync,
  appendFileSync,
  statSync,
  existsSync,
  rmSync,
} from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createMonitorScheduler } from "./monitor-loop.mjs";
export { transition } from "./monitor-loop.mjs";

export function probe(port, ca, timeoutMs = 10000, signal) {
  if (signal?.aborted) return Promise.resolve(false);
  return new Promise((resolveResult) => {
    let finished = false;
    const finish = (healthy) => {
      if (!finished) {
        finished = true;
        clearTimeout(deadline);
        resolveResult(healthy);
      }
    };
    const req = https.get(
      {
        hostname: "127.0.0.1",
        port,
        path: "/api/v1/system/health/ready",
        ca,
        signal,
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
          if (body.length > 65536) req.destroy();
        });
        res.on("error", () => finish(false));
        res.on("end", () => {
          try {
            const data = JSON.parse(body);
            finish(
              res.statusCode === 200 &&
                data.status === "ok" &&
                data.service === "gym4me-api" &&
                data.checks?.database === "up" &&
                data.checks?.storage === "up",
            );
          } catch {
            finish(false);
          }
        });
      },
    );
    const deadline = setTimeout(() => {
      finish(false);
      req.destroy();
    }, timeoutMs);
    req.on("error", () => finish(false));
  });
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const mode = process.argv[2] ?? "--once";
  if (!["--once", "--watch"].includes(mode) || process.argv.length > 3)
    throw new Error("Use --once or --watch.");
  const root = fileURLToPath(new URL("..", import.meta.url));
  const ca = readFileSync(resolve(root, ".staging-tls/ca.crt"));
  const directory = resolve(root, ".artifacts/staging-monitor");
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const log = resolve(directory, "events.jsonl");
  const outbox = resolve(directory, "outbox");
  const alertConfig = resolve(root, ".ops-private/monitor.env");
  const alerts = existsSync(alertConfig) ? privateConfig(alertConfig) : {};
  const targets = { api: 7443, application: 7181, admin: 7182, business: 7183 };
  let stopped = false;
  let timer;
  const stop = () => {
    stopped = true;
    clearTimeout(timer);
    monitor.stop();
  };
  const failed = () => {
    console.error(
      "Monitor failed to record health or deliver alerts; exiting.",
    );
    process.exitCode = 1;
    stop();
  };
  // A fresh process gathers evidence; delivery cannot block subsequent probes.
  const monitor = createMonitorScheduler({
    check: async (signal) => {
      const results = await Promise.all(
        Object.entries(targets).map(async ([service, port]) => [
          service,
          await probe(port, ca, 10000, signal),
        ]),
      );
      if (existsSync(resolve(root, ".ops-private/backup.env"))) {
        let operations = {};
        try {
          operations = JSON.parse(
            readFileSync(
              resolve(root, ".artifacts/operations/state.json"),
              "utf8",
            ),
          );
        } catch {
          /* Missing state must alert, never imply a working backup. */
        }
        results.push(...backupHealth(operations));
      }
      return results;
    },
    publish(snapshot, events) {
      for (const event of events) {
        if (existsSync(log) && statSync(log).size >= 1024 * 1024) {
          for (let i = 2; i >= 1; i--) {
            const source = `${log}.${i}`;
            const dest = `${log}.${i + 1}`;
            if (existsSync(source)) {
              if (existsSync(dest)) rmSync(dest);
              renameSync(source, dest);
            }
          }
          renameSync(log, `${log}.1`);
        }
        enqueueAlert(outbox, event);
        const line = JSON.stringify(event);
        appendFileSync(log, line + "\n", { mode: 0o600 });
        console.log(line);
      }
      const temporary = resolve(directory, `status-${process.pid}.tmp`);
      writeFileSync(temporary, JSON.stringify(snapshot, null, 2), {
        mode: 0o600,
      });
      renameSync(temporary, resolve(directory, "status.json"));
    },
    deliver: (signal) =>
      deliverAlerts(
        outbox,
        alerts.MONITOR_WEBHOOK_URL,
        alerts.MONITOR_WEBHOOK_TOKEN,
        fetch,
        Date.now(),
        signal,
      ),
    onError: failed,
  });
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  const tick = async () => {
    await monitor.tick();
    if (!stopped) timer = setTimeout(() => void tick().catch(failed), 30000);
  };
  if (mode === "--once") {
    try {
      const snapshot = await monitor.once();
      if (!stopped) {
        console.log(JSON.stringify(snapshot));
        process.exitCode = Object.values(snapshot.results).every(Boolean)
          ? 0
          : 1;
      }
    } catch {
      failed();
    }
  } else await tick().catch(failed);
}
