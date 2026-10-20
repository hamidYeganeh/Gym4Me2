import { spawnManaged } from "./managed-child.mjs";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
  openSync,
  closeSync,
  unlinkSync,
} from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
export const schedules = {
  ledger: 5 * 60000,
  snapshot: 24 * 3600000,
  check: 7 * 24 * 3600000,
};
export function dueJobs(state, now) {
  return Object.keys(schedules).filter((job) => {
    const previous = state[job];
    const retryAt = previous?.retryAt;
    const retryPending =
      Number.isSafeInteger(retryAt) &&
      retryAt > now &&
      retryAt <= now + 30 * 60000;
    const at = job === "check" ? previous?.successAt : previous?.sourceAt;
    const current = Number.isSafeInteger(at) && at > 0 && at <= now;
    return !retryPending && (!current || now - at >= schedules[job]);
  });
}
export function resultState(previous, ok, now, sourceAt = now) {
  const failures = ok ? 0 : (previous?.failures ?? 0) + 1;
  return {
    successAt: ok ? now : (previous?.successAt ?? 0),
    sourceAt: ok ? sourceAt : (previous?.sourceAt ?? 0),
    checkedAt: now,
    failures,
    retryAt: ok
      ? 0
      : now + Math.min(30 * 60000, 30000 * 2 ** Math.min(failures - 1, 6)),
  };
}

export function backupHealth(state, now = Date.now()) {
  const fresh = (job, limit, key) => {
    const at = state?.[job]?.[key];
    return Number.isSafeInteger(at) && at > 0 && at <= now && now - at < limit;
  };
  return [
    ["deletion-ledger", fresh("ledger", 10 * 60000, "sourceAt")],
    ["backup", fresh("snapshot", 26 * 3600000, "sourceAt")],
    ["backup-integrity", fresh("check", 8 * 24 * 3600000, "successAt")],
  ];
}

/** One ledger job and one data job at most; a long snapshot cannot hold up the mirror. */
export function createOperationsScheduler({
  state,
  run,
  persist,
  clock = Date.now,
  onError = () => {},
}) {
  const running = new Map();
  const controller = new AbortController();
  let stopped = false,
    fatal;
  async function execute(job) {
    let result;
    try {
      result = await run(job, controller.signal);
    } catch {
      result = { ok: false };
    }
    if (stopped) return;
    const now = clock();
    const sourceAt = job === "check" ? now : Date.parse(result?.capturedAt);
    const ok =
      result?.ok === true &&
      Number.isSafeInteger(sourceAt) &&
      sourceAt > 0 &&
      sourceAt <= now;
    state[job] = resultState(state[job], ok, now, sourceAt);
    await persist(state, { job, ok, at: new Date(now).toISOString() });
  }
  function start(lane, job) {
    const promise = execute(job)
      .catch((error) => {
        fatal = error;
        stopped = true;
        controller.abort();
        onError(error);
      })
      .finally(() => running.delete(lane));
    running.set(lane, promise);
    return promise;
  }
  return {
    tick() {
      if (fatal) throw fatal;
      if (stopped) return [];
      const started = [];
      const due = dueJobs(state, clock());
      if (!running.has("ledger") && due.includes("ledger"))
        started.push(start("ledger", "ledger"));
      if (!running.has("data")) {
        const job = due.find((name) => name !== "ledger");
        if (job) started.push(start("data", job));
      }
      return started;
    },
    async once() {
      // Manual one-shot checks stay sequential and low-load.
      for (const job of dueJobs(state, clock())) {
        if (stopped) break;
        await execute(job);
      }
    },
    stop() {
      stopped = true;
      controller.abort();
    },
    async drain() {
      await Promise.all(running.values());
      if (fatal) throw fatal;
    },
  };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (!["--once", "--watch"].includes(process.argv[2]))
    throw new Error("Use --once or --watch.");
  const directory = resolve(root, ".artifacts/operations");
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const lock = resolve(directory, "worker.lock");
  if (existsSync(lock)) {
    const pid = Number(readFileSync(lock, "utf8"));
    if (!Number.isSafeInteger(pid) || pid < 1)
      throw new Error("Invalid worker lock; inspect it before restarting.");
    try {
      process.kill(pid, 0);
      throw new Error("Operations worker already running.");
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
      unlinkSync(lock);
    }
  }
  const handle = openSync(lock, "wx", 0o600);
  writeFileSync(handle, String(process.pid));
  closeSync(handle);
  process.on("exit", () => {
    try {
      unlinkSync(lock);
    } catch {}
  });
  let stopped = false,
    timer,
    scheduler;
  const stop = () => {
    stopped = true;
    clearTimeout(timer);
    scheduler?.stop();
    // Managed children forward cancellation, finish cleanup, then release the lock on exit.
    void scheduler?.drain().catch(() => {
      process.exitCode = 1;
    });
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  const file = resolve(directory, "state.json");
  let state = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
  const run = async (job, signal) => {
    const task = spawnManaged(
      process.execPath,
      [
        "scripts/staging-backup.mjs",
        job,
        ...(job === "snapshot" ? ["--separate-ledger-worker"] : []),
      ],
      {
        cwd: root,
        env: process.env,
        stdio: ["ignore", "pipe", "ignore"],
      },
      { signal, timeoutMs: 35 * 60000, graceMs: 15000 },
    );
    const child = task.child;
    let output = "",
      invalid = false;
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      if (output.length + chunk.length > 4096) {
        invalid = true;
        void task
          .stop(new Error("Backup receipt exceeds its limit."))
          .catch(() => {});
      } else output += chunk;
    });
    const { code } = await task.completed;
    try {
      const receipt = JSON.parse(output);
      return {
        ok: code === 0 && !invalid && receipt.operation === job,
        capturedAt: receipt.capturedAt,
      };
    } catch {
      return { ok: false };
    }
  };
  scheduler = createOperationsScheduler({
    state,
    run,
    persist(current, event) {
      const temp = `${file}.${process.pid}.tmp`;
      writeFileSync(temp, JSON.stringify(current, null, 2), { mode: 0o600 });
      renameSync(temp, file);
      console.log(JSON.stringify(event));
    },
    onError() {
      process.exitCode = 1;
      stop();
    },
  });
  const tick = () => {
    try {
      scheduler.tick();
      if (!stopped) timer = setTimeout(tick, 30000);
    } catch {
      process.exitCode = 1;
      stop();
    }
  };
  if (process.argv[2] === "--watch") tick();
  else {
    await scheduler.once();
    if (Object.values(state).some((job) => job.failures)) process.exitCode = 1;
  }
}
