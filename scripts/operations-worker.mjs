import { spawn } from "node:child_process";
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
  return Object.keys(schedules).filter(
    (job) =>
      now >= (state[job]?.retryAt ?? 0) &&
      now - (state[job]?.successAt ?? 0) >= schedules[job],
  );
}
export function resultState(previous, ok, now) {
  const failures = ok ? 0 : (previous?.failures ?? 0) + 1;
  return {
    successAt: ok ? now : (previous?.successAt ?? 0),
    checkedAt: now,
    failures,
    retryAt: ok
      ? 0
      : now + Math.min(30 * 60000, 30000 * 2 ** Math.min(failures - 1, 6)),
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
    child;
  const stop = () => {
    stopped = true;
    clearTimeout(timer);
    child?.kill("SIGTERM");
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  const file = resolve(directory, "state.json");
  let state = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
  const run = (script, args) =>
    new Promise((done) => {
      child = spawn(process.execPath, [script, ...args], {
        cwd: root,
        env: process.env,
        stdio: "ignore",
        timeout: 35 * 60000,
      });
      child.once("error", () => done(false));
      child.once("close", (code) => done(code === 0));
    });
  const tick = async () => {
    for (const job of dueJobs(state, Date.now())) {
      if (stopped) break;
      const ok = await run("scripts/staging-backup.mjs", [job]);
      state[job] = resultState(state[job], ok, Date.now());
      const temp = `${file}.${process.pid}.tmp`;
      writeFileSync(temp, JSON.stringify(state, null, 2), { mode: 0o600 });
      renameSync(temp, file);
      console.log(JSON.stringify({ job, ok, at: new Date().toISOString() }));
    }
    if (!stopped && process.argv[2] === "--watch")
      timer = setTimeout(
        () =>
          void tick().catch(() => {
            process.exitCode = 1;
            stop();
          }),
        30000,
      );
    else if (Object.values(state).some((job) => job.failures))
      process.exitCode = 1;
  };
  await tick();
}
