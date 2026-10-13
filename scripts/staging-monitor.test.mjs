import { test } from "node:test";
import assert from "node:assert/strict";
import https from "node:https";
import { readFileSync } from "node:fs";
import { transition, probe } from "./staging-monitor.mjs";
test("alerts on three failures, suppresses duplicates, recovers after two successes", () => {
  let state;
  function step(healthy) {
    const result = transition(state, healthy);
    state = result.next;
    return result.event?.type;
  }
  assert.equal(step(false), undefined);
  assert.equal(step(true), undefined);
  assert.equal(step(false), undefined);
  assert.equal(step(false), undefined);
  assert.equal(step(false), "incident");
  assert.equal(step(false), undefined);
  assert.equal(step(true), undefined);
  assert.equal(step(true), "recovered");
  assert.equal(step(true), undefined);
});
test("readiness validates dependency content, TLS and a total request deadline", async () => {
  const ca = readFileSync(new URL("../.staging-tls/ca.crt", import.meta.url));
  const key = readFileSync(
    new URL("../.staging-tls/server.key", import.meta.url),
  );
  const cert = readFileSync(
    new URL("../.staging-tls/server.crt", import.meta.url),
  );
  let mode = "up";
  const server = https.createServer({ key, cert }, (_req, res) => {
    if (mode === "hang") return;
    res.end(
      JSON.stringify({
        status: "ok",
        service: "gym4me-api",
        checks: { database: "up", storage: mode },
      }),
    );
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  try {
    assert.equal(await probe(port, ca), true);
    mode = "down";
    assert.equal(await probe(port, ca), false);
    assert.equal(await probe(port, undefined), false);
    mode = "hang";
    assert.equal(await probe(port, ca, 30), false);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
