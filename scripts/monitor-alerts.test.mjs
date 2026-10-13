import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { enqueueAlert, deliverAlerts } from "./monitor-alerts.mjs";
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
