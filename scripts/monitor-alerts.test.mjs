import assert from "node:assert/strict";
import test from "node:test";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import https from "node:https";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { enqueueAlert, deliverAlerts } from "./monitor-alerts.mjs";

function queuedAlert(dir, order, overrides = {}) {
  const event = {
    service: "api",
    type: "incident",
    at: "2026-10-19T00:00:00.000Z",
    eventId: randomUUID(),
    attempts: 0,
    retryAt: 0,
    ...overrides,
  };
  const file = join(dir, `${1000000000000 + order}-${randomUUID()}.json`);
  writeFileSync(file, JSON.stringify(event), { mode: 0o600 });
  return { file, event };
}

test("alerts persist offline and retry with a stable idempotency key", async () => {
  const dir = mkdtempSync(join(tmpdir(), "gym-alert-"));
  let calls = 0;
  const keys = [];
  try {
    enqueueAlert(dir, { service: "api", type: "healthy", at: "now" });
    assert.equal(readdirSync(dir).length, 0);
    enqueueAlert(dir, { service: "api", type: "incident", at: "now" });
    const sender = async (_url, options) => {
      calls++;
      keys.push(options.headers["idempotency-key"]);
      return new Response("", { status: calls === 1 ? 503 : 200 });
    };
    assert.deepEqual(await deliverAlerts(dir, undefined, undefined, sender), {
      configured: false,
    });
    assert.equal(calls, 0);
    await deliverAlerts(dir, "https://alerts.example/", "test", sender, 1000);
    await deliverAlerts(dir, "https://alerts.example/", "test", sender, 2000);
    assert.equal(calls, 1);
    await deliverAlerts(dir, "https://alerts.example/", "test", sender, 32000);
    assert.equal(calls, 2);
    assert.equal(keys[0], keys[1]);
    assert.equal(readdirSync(dir).length, 0);
    await assert.rejects(deliverAlerts(dir, "http://alerts.example/"), /HTTPS/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("twenty deferred records cannot hide a new due incident", async () => {
  const dir = mkdtempSync(join(tmpdir(), "gym-alert-fair-"));
  try {
    for (let i = 0; i < 20; i++) queuedAlert(dir, i, { retryAt: 50000 });
    const due = queuedAlert(dir, 20);
    const sent = [];
    const result = await deliverAlerts(
      dir,
      "https://alerts.example/",
      undefined,
      async (_url, options) => {
        sent.push(JSON.parse(options.body).eventId);
        return new Response(null, { status: 204 });
      },
      1000,
    );
    assert.deepEqual(sent, [due.event.eventId]);
    assert.deepEqual(result, {
      configured: true,
      delivered: 1,
      attempted: 1,
      invalid: 0,
    });
    assert.equal(readdirSync(dir).length, 20);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a pass attempts at most twenty due alerts after skipping backoff", async () => {
  const dir = mkdtempSync(join(tmpdir(), "gym-alert-batch-"));
  try {
    for (let i = 0; i < 20; i++) queuedAlert(dir, i, { retryAt: 50000 });
    for (let i = 20; i < 45; i++) queuedAlert(dir, i);
    let calls = 0;
    const sender = async () => {
      calls++;
      return new Response(null, { status: 204 });
    };
    const first = await deliverAlerts(
      dir,
      "https://alerts.example/",
      undefined,
      sender,
      1000,
    );
    assert.equal(first.attempted, 20);
    assert.equal(first.delivered, 20);
    assert.equal(calls, 20);
    const second = await deliverAlerts(
      dir,
      "https://alerts.example/",
      undefined,
      sender,
      1000,
    );
    assert.equal(second.attempted, 5);
    assert.equal(second.delivered, 5);
    assert.equal(calls, 25);
    assert.equal(readdirSync(dir).length, 20);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("damaged records remain inspectable while valid alerts can be delivered", async () => {
  const dir = mkdtempSync(join(tmpdir(), "gym-alert-invalid-"));
  try {
    const broken = queuedAlert(dir, 0);
    writeFileSync(broken.file, "{");
    const missingId = queuedAlert(dir, 1, { eventId: null });
    const invalidRetry = queuedAlert(dir, 2, { retryAt: -1 });
    const due = queuedAlert(dir, 3);
    const sent = [];
    const result = await deliverAlerts(
      dir,
      "https://alerts.example/",
      undefined,
      async (_url, options) => {
        sent.push(JSON.parse(options.body).eventId);
        return new Response(null, { status: 204 });
      },
      1000,
    );
    assert.deepEqual(sent, [due.event.eventId]);
    assert.equal(result.invalid, 3);
    assert.equal(result.delivered, 1);
    assert.equal(readFileSync(broken.file, "utf8"), "{");
    assert.equal(JSON.parse(readFileSync(missingId.file)).eventId, null);
    assert.equal(JSON.parse(readFileSync(invalidRetry.file)).retryAt, -1);
    assert.equal(readdirSync(dir).length, 3);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("retry publishes a complete private record with the same event identity", async () => {
  const dir = mkdtempSync(join(tmpdir(), "gym-alert-retry-"));
  try {
    const queued = queuedAlert(dir, 0);
    chmodSync(queued.file, 0o644);
    await deliverAlerts(
      dir,
      "https://alerts.example/",
      undefined,
      async () => {
        throw new Error("Offline");
      },
      1000,
    );
    assert.deepEqual(JSON.parse(readFileSync(queued.file)), {
      ...queued.event,
      attempts: 1,
      retryAt: 31000,
    });
    assert.equal(statSync(queued.file).mode & 0o777, 0o600);
    assert.deepEqual(readdirSync(dir), [queued.file.split("/").at(-1)]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("rejected responses release their body before scheduling a retry", async () => {
  const dir = mkdtempSync(join(tmpdir(), "gym-alert-body-"));
  try {
    queuedAlert(dir, 0);
    let cancelled = false;
    const result = await deliverAlerts(
      dir,
      "https://alerts.example/",
      undefined,
      async () => ({
        ok: false,
        body: {
          cancel: async () => {
            cancelled = true;
          },
        },
      }),
      1000,
    );
    assert.equal(cancelled, true);
    assert.equal(result.delivered, 0);
    assert.equal(result.attempted, 1);
    assert.equal(readdirSync(dir).length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("shutdown aborts delivery without advancing retry or starting another record", async () => {
  const dir = mkdtempSync(join(tmpdir(), "gym-alert-abort-"));
  const controller = new AbortController();
  let ready;
  const started = new Promise((resolve) => {
    ready = resolve;
  });
  try {
    const first = queuedAlert(dir, 0),
      second = queuedAlert(dir, 1);
    let calls = 0;
    const sender = async (_url, options) => {
      calls++;
      ready();
      return new Promise((_resolve, reject) =>
        options.signal.addEventListener(
          "abort",
          () => reject(options.signal.reason),
          { once: true },
        ),
      );
    };
    const pending = deliverAlerts(
      dir,
      "https://alerts.example/",
      undefined,
      sender,
      1000,
      controller.signal,
    );
    await started;
    controller.abort();
    const result = await pending;
    assert.equal(result.attempted, 1);
    assert.equal(result.delivered, 0);
    assert.equal(calls, 1);
    assert.deepEqual(JSON.parse(readFileSync(first.file)), first.event);
    assert.deepEqual(JSON.parse(readFileSync(second.file)), second.event);
    const stopped = await deliverAlerts(
      dir,
      "https://alerts.example/",
      undefined,
      sender,
      1000,
      controller.signal,
    );
    assert.equal(stopped.attempted, 0);
    assert.equal(calls, 1);
  } finally {
    controller.abort();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("real fetch rejects untrusted TLS and retries HTTPS rejection without changing identity", async () => {
  const dir = mkdtempSync(join(tmpdir(), "gym-alert-https-"));
  const tls = mkdtempSync(join(tmpdir(), "gym-alert-tls-"));
  const run = promisify(execFile);
  let server;
  try {
    await run(
      "openssl",
      [
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-nodes",
        "-sha256",
        "-days",
        "1",
        "-subj",
        "/CN=Gym4Me Alert Test",
        "-keyout",
        join(tls, "server.key"),
        "-out",
        join(tls, "server.crt"),
        "-addext",
        "subjectAltName=IP:127.0.0.1",
        "-addext",
        "basicConstraints=critical,CA:TRUE",
      ],
      { timeout: 10000 },
    );
    const received = [];
    let onHangingRequest;
    server = https.createServer(
      {
        key: readFileSync(join(tls, "server.key")),
        cert: readFileSync(join(tls, "server.crt")),
      },
      (request, response) => {
        const chunks = [];
        request.on("data", (chunk) => chunks.push(chunk));
        request.on("end", () => {
          received.push({
            method: request.method,
            path: request.url,
            authorization: request.headers.authorization,
            key: request.headers["idempotency-key"],
            body: JSON.parse(Buffer.concat(chunks)),
          });
          if (onHangingRequest) {
            onHangingRequest();
            return;
          }
          response.writeHead(received.length === 1 ? 503 : 204);
          response.end();
        });
      },
    );
    server.on("tlsClientError", () => {});
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const endpoint = `https://127.0.0.1:${server.address().port}/fixture-alert`;
    const queued = queuedAlert(dir, 0);
    function environment(trusted) {
      const env = { ...process.env };
      delete env.NODE_TLS_REJECT_UNAUTHORIZED;
      delete env.NODE_EXTRA_CA_CERTS;
      if (trusted) env.NODE_EXTRA_CA_CERTS = join(tls, "server.crt");
      return env;
    }
    async function deliver(now, trusted) {
      const source = `import { deliverAlerts } from ${JSON.stringify(new URL("monitor-alerts.mjs", import.meta.url).href)}; console.log(JSON.stringify(await deliverAlerts(process.argv[1], process.argv[2], 'fixture-monitor-token', fetch, Number(process.argv[3]))));`;
      const result = await run(
        process.execPath,
        [
          "--max-old-space-size=96",
          "--input-type=module",
          "-e",
          source,
          dir,
          endpoint,
          String(now),
        ],
        { env: environment(trusted), timeout: 15000 },
      );
      return JSON.parse(result.stdout);
    }
    const untrusted = await deliver(1000, false);
    assert.equal(untrusted.delivered, 0);
    assert.equal(received.length, 0);
    assert.equal(JSON.parse(readFileSync(queued.file)).attempts, 1);
    const rejected = await deliver(32000, true);
    assert.equal(rejected.delivered, 0);
    assert.equal(received.length, 1);
    assert.equal(JSON.parse(readFileSync(queued.file)).attempts, 2);
    const accepted = await deliver(93000, true);
    assert.equal(accepted.delivered, 1);
    assert.equal(received.length, 2);
    assert.equal(readdirSync(dir).length, 0);
    for (const request of received) {
      assert.equal(request.method, "POST");
      assert.equal(request.path, "/fixture-alert");
      assert.equal(request.authorization, "Bearer fixture-monitor-token");
      assert.equal(request.key, queued.event.eventId);
      assert.deepEqual(request.body, {
        eventId: queued.event.eventId,
        service: "api",
        type: "incident",
        at: queued.event.at,
      });
    }
    const cancelledFirst = queuedAlert(dir, 0),
      cancelledSecond = queuedAlert(dir, 1);
    const source = `import { deliverAlerts } from ${JSON.stringify(new URL("monitor-alerts.mjs", import.meta.url).href)}; const controller = new AbortController(); process.stdin.once('data', () => controller.abort()); const result = await deliverAlerts(process.argv[1], process.argv[2], undefined, fetch, 1000, controller.signal); process.stdin.destroy(); console.log(JSON.stringify(result));`;
    const cancelled = await new Promise((resolve, reject) => {
      const child = execFile(
        process.execPath,
        [
          "--max-old-space-size=96",
          "--input-type=module",
          "-e",
          source,
          dir,
          endpoint,
        ],
        { env: environment(true), timeout: 15000 },
        (error, stdout) => {
          if (error) reject(error);
          else {
            try {
              resolve(JSON.parse(stdout));
            } catch (invalid) {
              reject(invalid);
            }
          }
        },
      );
      onHangingRequest = () => child.stdin.end("abort\n");
    });
    assert.equal(received.length, 3);
    assert.equal(cancelled.attempted, 1);
    assert.equal(cancelled.delivered, 0);
    assert.deepEqual(
      JSON.parse(readFileSync(cancelledFirst.file)),
      cancelledFirst.event,
    );
    assert.deepEqual(
      JSON.parse(readFileSync(cancelledSecond.file)),
      cancelledSecond.event,
    );
  } finally {
    if (server) {
      server.closeAllConnections();
      if (server.listening)
        await new Promise((resolve) => server.close(resolve));
    }
    rmSync(dir, { recursive: true, force: true });
    rmSync(tls, { recursive: true, force: true });
  }
});
