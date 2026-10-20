import { test } from "node:test";
import assert from "node:assert/strict";
import https from "node:https";
import { readFileSync } from "node:fs";
import { transition, probe } from "./staging-monitor.mjs";
import { createMonitorScheduler } from "./monitor-loop.mjs";

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
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
  let onHang;
  const server = https.createServer({ key, cert }, (_req, res) => {
    if (mode === "hang") {
      onHang?.();
      return;
    }
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
    const controller = new AbortController();
    const arrived = deferred();
    onHang = arrived.resolve;
    const pending = probe(port, ca, 5000, controller.signal);
    await arrived.promise;
    const stoppedAt = performance.now();
    controller.abort();
    assert.equal(await pending, false);
    assert.ok(performance.now() - stoppedAt < 1000);
    assert.equal(await probe(port, ca, 5000, controller.signal), false);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test(
  "slow delivery cannot block health, duplicate a sender or rewind a newer snapshot",
  { timeout: 2000 },
  async () => {
    const gate = deferred(),
      started = deferred();
    let now = Date.parse("2026-10-19T00:00:00Z"),
      sends = 0;
    const snapshots = [],
      events = [];
    const monitor = createMonitorScheduler({
      check: async () => [["api", false]],
      publish(snapshot, fresh) {
        snapshots.push(snapshot);
        events.push(...fresh);
      },
      deliver: async () => {
        sends++;
        if (sends === 1) {
          started.resolve();
          await gate.promise;
        }
        return { configured: true, delivered: 0 };
      },
      clock: () => now,
    });
    try {
      await monitor.tick();
      await started.promise;
      const first = snapshots[0];
      now += 30000;
      await monitor.tick();
      now += 30000;
      await monitor.tick();
      assert.equal(sends, 1);
      assert.equal(
        events.filter((event) => event.type === "incident").length,
        1,
      );
      assert.equal(snapshots.at(-1).states.api.status, "down");
      assert.equal(first.states.api.failures, 1);
      const latestHealth = snapshots.at(-1).checkedAt;
      gate.resolve();
      await monitor.drain();
      assert.equal(sends, 2);
      assert.equal(snapshots.at(-1).checkedAt, latestHealth);
      assert.equal(snapshots.at(-1).alertDelivery.running, false);
      for (const snapshot of snapshots.filter(
        (s) => s.alertDelivery.completedAt,
      ))
        assert.equal(snapshot.checkedAt, latestHealth);
    } finally {
      monitor.stop();
      gate.resolve();
      await monitor.drain();
    }
  },
);

test("overlapping ticks share one live probe", { timeout: 2000 }, async () => {
  const gate = deferred(),
    started = deferred();
  let checks = 0;
  const monitor = createMonitorScheduler({
    check: async () => {
      checks++;
      started.resolve();
      return gate.promise;
    },
    publish() {},
    deliver: async () => ({ configured: false }),
  });
  try {
    const first = monitor.tick(),
      second = monitor.tick();
    assert.equal(first, second);
    await started.promise;
    assert.equal(checks, 1);
    gate.resolve([["api", true]]);
    await first;
    await monitor.drain();
    assert.equal(checks, 1);
  } finally {
    monitor.stop();
    gate.resolve([]);
    await monitor.drain();
  }
});

test(
  "a probe published while delivery finalizes still receives its following pass",
  { timeout: 2000 },
  async () => {
    const gate = deferred();
    let checks = 0,
      sends = 0,
      requested = false;
    const monitor = createMonitorScheduler({
      check: async () => {
        checks++;
        return [["api", true]];
      },
      publish(snapshot) {
        if (snapshot.alertDelivery.completedAt && !requested) {
          requested = true;
          void monitor.tick();
        }
      },
      deliver: async () => {
        sends++;
        if (sends === 1) await gate.promise;
        return { configured: false };
      },
    });
    try {
      await monitor.tick();
      gate.resolve();
      await monitor.drain();
      assert.equal(checks, 2);
      assert.equal(sends, 2);
    } finally {
      monitor.stop();
      gate.resolve();
      await monitor.drain();
    }
  },
);

test(
  "once waits for the pass that includes events published during an older delivery",
  { timeout: 2000 },
  async () => {
    const firstGate = deferred(),
      secondGate = deferred(),
      secondStarted = deferred();
    let sends = 0,
      finished = false;
    const queue = [],
      batches = [];
    const monitor = createMonitorScheduler({
      check: async () => [["api", false]],
      publish(_snapshot, events) {
        queue.push(...events.filter((e) => e.type === "incident"));
      },
      deliver: async () => {
        sends++;
        batches.push(queue.splice(0));
        if (sends === 1) await firstGate.promise;
        else {
          secondStarted.resolve();
          await secondGate.promise;
        }
        return { configured: true, delivered: batches.at(-1).length };
      },
    });
    try {
      await monitor.tick();
      await monitor.tick();
      const once = monitor.once().then((value) => {
        finished = true;
        return value;
      });
      // The third probe enqueues the incident while pass one is still pending.
      await monitor.tick();
      assert.equal(finished, false);
      firstGate.resolve();
      await secondStarted.promise;
      assert.equal(finished, false);
      assert.equal(batches[0].length, 0);
      assert.equal(batches[1].length, 1);
      secondGate.resolve();
      const snapshot = await once;
      assert.equal(snapshot.states.api.status, "down");
      assert.equal(sends, 2);
    } finally {
      monitor.stop();
      firstGate.resolve();
      secondGate.resolve();
      await monitor.drain();
    }
  },
);

test(
  "stop aborts both lanes and ignores their late completions",
  { timeout: 2000 },
  async () => {
    const checking = deferred(),
      delivering = deferred();
    let checks = 0,
      sends = 0,
      errors = 0;
    const snapshots = [];
    let checkSignal, deliverySignal;
    const monitor = createMonitorScheduler({
      check: async (signal) => {
        checks++;
        if (checks === 1) return [["api", true]];
        checkSignal = signal;
        checking.resolve();
        return new Promise((resolve) =>
          signal.addEventListener("abort", () => resolve([["api", false]]), {
            once: true,
          }),
        );
      },
      publish(snapshot) {
        snapshots.push(snapshot);
      },
      deliver: async (signal) => {
        sends++;
        deliverySignal = signal;
        delivering.resolve();
        return new Promise((_resolve, reject) =>
          signal.addEventListener("abort", () => reject(signal.reason), {
            once: true,
          }),
        );
      },
      onError() {
        errors++;
      },
    });
    await monitor.tick();
    await delivering.promise;
    const pending = monitor.tick();
    await checking.promise;
    const count = snapshots.length;
    monitor.stop();
    await pending;
    await monitor.drain();
    await monitor.tick();
    await monitor.once();
    assert.equal(checkSignal.aborted, true);
    assert.equal(deliverySignal.aborted, true);
    assert.equal(snapshots.length, count);
    assert.equal(checks, 2);
    assert.equal(sends, 1);
    assert.equal(errors, 0);
  },
);

test("a failed publication rejects once and never starts delivery", async () => {
  let sends = 0,
    errors = 0;
  const monitor = createMonitorScheduler({
    check: async () => [["api", true]],
    publish() {
      throw new Error("Fixture disk unavailable");
    },
    deliver: async () => {
      sends++;
      return { configured: false };
    },
    onError() {
      errors++;
    },
  });
  await assert.rejects(monitor.once(), /Fixture disk unavailable/);
  assert.equal(sends, 0);
  assert.equal(errors, 1);
  assert.throws(() => monitor.tick(), /Fixture disk unavailable/);
});

test("stop before the first microtask prevents a new probe from starting", async () => {
  let checks = 0,
    sends = 0,
    publications = 0;
  const monitor = createMonitorScheduler({
    check: async () => {
      checks++;
      return [["api", true]];
    },
    publish() {
      publications++;
    },
    deliver: async () => {
      sends++;
      return { configured: false };
    },
  });
  const pending = monitor.tick();
  monitor.stop();
  await pending;
  await monitor.drain();
  assert.equal(checks, 0);
  assert.equal(sends, 0);
  assert.equal(publications, 0);
});

test("delivery failure reaches once without pretending health delivery succeeded", async () => {
  let errors = 0;
  const monitor = createMonitorScheduler({
    check: async () => [["api", true]],
    publish() {},
    deliver: async () => {
      throw new Error("Fixture outbox unavailable");
    },
    onError() {
      errors++;
    },
  });
  await assert.rejects(monitor.once(), /Fixture outbox unavailable/);
  assert.equal(errors, 1);
});
