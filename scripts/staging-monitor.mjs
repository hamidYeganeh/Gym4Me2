import { enqueueAlert, deliverAlerts } from "./monitor-alerts.mjs";
import { privateConfig } from "./staging-backup.mjs";
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

export function transition(
  previous = { status: "unknown", failures: 0, successes: 0 },
  healthy,
  now = new Date().toISOString(),
) {
  const next = {
    ...previous,
    failures: healthy ? 0 : previous.failures + 1,
    successes: healthy ? previous.successes + 1 : 0,
    checkedAt: now,
  };
  let event;
  if (!healthy && next.failures >= 3 && previous.status !== "down") {
    next.status = "down";
    next.downSince = now;
    event = { type: "incident", at: now };
  } else if (healthy && next.successes >= 2 && previous.status !== "up") {
    next.status = "up";
    delete next.downSince;
    event = {
      type: previous.status === "down" ? "recovered" : "healthy",
      at: now,
    };
  }
  return { next, event };
}
export function probe(port, ca, timeoutMs = 10000) {
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
      { hostname: "127.0.0.1", port, path: "/api/v1/system/health/ready", ca },
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
  // A fresh process gathers new evidence instead of trusting stale status files.
  const states = {};
  let stopped = false;
  let timer;
  const stop = () => {
    stopped = true;
    clearTimeout(timer);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  const tick = async () => {
    const results = await Promise.all(
      Object.entries(targets).map(async ([service, port]) => [
        service,
        await probe(port, ca),
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
      const age = (job) => Date.now() - (operations[job]?.successAt ?? 0);
      results.push(["deletion-ledger", age("ledger") < 10 * 60000]);
      results.push(["backup", age("snapshot") < 26 * 3600000]);
      results.push(["backup-integrity", age("check") < 8 * 24 * 3600000]);
    }
    const now = new Date().toISOString();
    for (const [service, healthy] of results) {
      const { next, event } = transition(states[service], healthy, now);
      states[service] = next;
      if (event) {
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
        enqueueAlert(outbox, { service, ...event });
        const line = JSON.stringify({ service, ...event });
        appendFileSync(log, line + "\n", { mode: 0o600 });
        console.log(line);
      }
    }
    const alertDelivery = await deliverAlerts(
      outbox,
      alerts.MONITOR_WEBHOOK_URL,
      alerts.MONITOR_WEBHOOK_TOKEN,
    );
    const snapshot = {
      alertDelivery,
      checkedAt: now,
      results: Object.fromEntries(results),
      states,
    };
    const temporary = resolve(directory, `status-${process.pid}.tmp`);
    writeFileSync(temporary, JSON.stringify(snapshot, null, 2), {
      mode: 0o600,
    });
    renameSync(temporary, resolve(directory, "status.json"));
    if (mode === "--once") {
      console.log(JSON.stringify(snapshot));
      process.exitCode = results.every(([, healthy]) => healthy) ? 0 : 1;
    } else if (!stopped)
      timer = setTimeout(
        () =>
          void tick().catch(() => {
            console.error("Monitor failed to record health; exiting.");
            process.exitCode = 1;
          }),
        30000,
      );
  };
  await tick();
}
