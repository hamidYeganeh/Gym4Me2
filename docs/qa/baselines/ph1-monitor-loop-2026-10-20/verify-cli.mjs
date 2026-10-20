import assert from "node:assert/strict";
import * as fs from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import https from "node:https";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { enqueueAlert } from "../../scripts/monitor-alerts.mjs";

const root = process.cwd();
const artifact = resolve(root, ".artifacts/ph1-monitor-loop-2026-10-19");
// macOS /var is a symlink; keep argv and ESM's canonical entry URL identical.
const capsule = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), "gym-monitor-cli-")));
const servers = [];
const targets = { api: 7443, application: 7181, admin: 7182, business: 7183 };
const checks = Object.fromEntries(Object.keys(targets).map(name => [name, 0]));
const active = new Set();
const scriptNames = ["staging-monitor", "monitor-loop", "monitor-alerts", "staging-backup", "operations-worker", "backup-capture", "backup-media", "backup-retention"];
let child, exited, closed = false, posts = 0, receipt;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const run = promisify(execFile);
async function until(check, limit = 45000) {
  const start = Date.now();
  while (!check()) {
    if (closed) throw new Error("Owned monitor ended before the observation");
    if (Date.now() - start > limit) throw new Error("Observation deadline exceeded");
    await sleep(100);
  }
}
async function bounded(promise, milliseconds) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error("Owned monitor did not stop")), milliseconds);
    })]);
  } finally { clearTimeout(timer); }
}
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const listen = async (server, port) => {
  servers.push(server);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
};
try {
  for (const directory of ["scripts", "apps/api", ".staging-tls", ".ops-private"])
    fs.mkdirSync(join(capsule, directory), { recursive: true, mode: 0o700 });
  const sourceHashes = {};
  for (const name of scriptNames) {
    const path = `scripts/${name}.mjs`;
    const bytes = fs.readFileSync(join(root, path));
    fs.writeFileSync(join(capsule, path), bytes);
    sourceHashes[path] = hash(bytes);
  }
  fs.copyFileSync(join(root, "apps/api/package.json"), join(capsule, "apps/api/package.json"));
  fs.symlinkSync(join(root, "apps/api/node_modules"), join(capsule, "apps/api/node_modules"));
  const tls = join(capsule, ".staging-tls");
  await run("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-sha256", "-days", "1", "-subj", "/CN=Gym4Me Monitor CLI Test", "-keyout", join(tls, "server.key"), "-out", join(tls, "server.crt"), "-addext", "subjectAltName=IP:127.0.0.1", "-addext", "basicConstraints=critical,CA:TRUE"], { timeout: 10000 });
  fs.copyFileSync(join(tls, "server.crt"), join(tls, "ca.crt"));
  const options = { key: fs.readFileSync(join(tls, "server.key")), cert: fs.readFileSync(join(tls, "server.crt")) };
  for (const [service, port] of Object.entries(targets)) {
    await listen(https.createServer(options, (request, response) => {
      if (request.url !== "/api/v1/system/health/ready") { response.writeHead(404); response.end(); return; }
      checks[service]++;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ status: "ok", service: "gym4me-api", checks: { database: "up", storage: "up" } }));
    }), port);
  }
  const sink = https.createServer(options, (request, response) => {
    const key = request.headers["idempotency-key"];
    posts++;
    active.add(key);
    response.on("close", () => active.delete(key));
    request.resume();
    // Intentionally leave every webhook response pending until client cancellation.
  });
  await listen(sink, 0);
  fs.writeFileSync(join(capsule, ".ops-private/monitor.env"), `MONITOR_WEBHOOK_URL=https://127.0.0.1:${sink.address().port}/fixture-alert\nMONITOR_WEBHOOK_TOKEN=fixture-only-token\n`, { mode: 0o600 });
  const directory = join(capsule, ".artifacts/staging-monitor");
  const outbox = join(directory, "outbox");
  for (let i = 0; i < 4; i++) enqueueAlert(outbox, { service: "fixture", type: "incident", at: new Date().toISOString() });
  const env = { ...process.env, NODE_EXTRA_CA_CERTS: join(tls, "ca.crt"), NODE_OPTIONS: "--max-old-space-size=96" };
  delete env.NODE_TLS_REJECT_UNAUTHORIZED;
  const log = fs.openSync(join(artifact, "cli-monitor.log"), "w", 0o600);
  const beganAt = Date.now();
  try {
    child = spawn(process.execPath, [join(capsule, "scripts/staging-monitor.mjs"), "--watch"], { cwd: capsule, env, stdio: ["ignore", log, log] });
  } finally { fs.closeSync(log); }
  exited = new Promise((resolve, reject) => {
    child.once("error", error => { closed = true; reject(error); });
    child.once("exit", (code, signal) => { closed = true; resolve({ code, signal }); });
  });
  const statusPath = join(directory, "status.json");
  const readStatus = () => {
    try { return JSON.parse(fs.readFileSync(statusPath)); } catch { return undefined; }
  };
  await until(() => readStatus()?.alertDelivery.running === true && active.size > 0);
  const first = readStatus();
  console.log("Owned CLI saved first health while webhook is pending; waiting for its real 30-second cycle.");
  await until(() => {
    const next = readStatus();
    return next?.checkedAt !== first.checkedAt && next?.alertDelivery.running === true && active.size > 0 && Object.values(checks).every(count => count >= 2);
  });
  const second = readStatus();
  assert.ok(Object.values(second.results).every(Boolean));
  const currentKey = [...active].at(-1);
  const rows = () => fs.readdirSync(outbox).filter(name => name.endsWith(".json")).map(name => ({ name, value: JSON.parse(fs.readFileSync(join(outbox, name))) }));
  const before = rows().find(row => row.value.eventId === currentKey);
  assert.ok(before, "Expected an owned pending webhook record");
  const beforeStatus = hash(fs.readFileSync(statusPath));
  const stoppedAt = Date.now();
  child.kill("SIGTERM");
  const exit = await bounded(exited, 3000);
  const shutdownMs = Date.now() - stoppedAt;
  assert.deepEqual(exit, { code: 0, signal: null });
  const after = rows();
  assert.equal(after.length, 4);
  assert.deepEqual(after.find(row => row.value.eventId === currentKey), before);
  assert.equal(hash(fs.readFileSync(statusPath)), beforeStatus);
  receipt = {
    at: new Date().toISOString(), mode: "unmodified copied CLI --watch",
    sourceSha256: sourceHashes, checksPerTarget: checks,
    firstCheckedAt: first.checkedAt, secondCheckedAt: second.checkedAt,
    healthAdvancedWhileDeliveryRunning: true,
    secondHealth: second.results, webhookRequests: posts,
    elapsedMs: Date.now() - beganAt, shutdownMs, exit,
    queueRecordsAfterStop: after.length,
    pendingRecordUnchangedAfterStop: true, statusUnchangedAfterStop: true,
    applicationOrDatabaseStarted: false, externalEndpointUsed: false,
  };
} finally {
  if (child && !closed) {
    child.kill("SIGTERM");
    try { await bounded(exited, 3000); } catch { child.kill("SIGKILL"); await exited; }
  }
  for (const server of servers) {
    server.closeAllConnections();
    if (server.listening) await new Promise(resolve => server.close(resolve));
  }
  fs.rmSync(capsule, { recursive: true, force: true });
}
if (receipt) {
  receipt.temporaryDirectoryRemoved = !fs.existsSync(capsule);
  receipt.mockServersClosed = servers.every(server => !server.listening);
  fs.writeFileSync(join(artifact, "cli-receipt.json"), JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt));
}
