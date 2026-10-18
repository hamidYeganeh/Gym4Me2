import test from "node:test";
import assert from "node:assert/strict";
import {
  dueJobs,
  resultState,
  schedules,
  createOperationsScheduler,
  backupHealth,
} from "./operations-worker.mjs";
test("schedule survives restarts, backs off failures and doesn't erase last good backup", () => {
  const now = Date.now();
  assert.deepEqual(dueJobs({}, now), ["ledger", "snapshot", "check"]);
  const good = resultState(undefined, true, now);
  assert.deepEqual(
    dueJobs({ ledger: good, snapshot: good, check: good }, now + 1000),
    [],
  );
  const failed = resultState(good, false, now + schedules.ledger);
  assert.equal(failed.successAt, now);
  assert.equal(failed.retryAt, now + schedules.ledger + 30000);
  assert.ok(
    !dueJobs({ ledger: failed }, failed.retryAt - 1).includes("ledger"),
  );
  assert.ok(dueJobs({ ledger: failed }, failed.retryAt).includes("ledger"));
  assert.equal(
    resultState(failed, true, now + schedules.ledger + 60000).failures,
    0,
  );
});

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test("ledger continues on its own schedule while a long snapshot holds the data lane", async () => {
  let now = Date.now();
  const requests = [],
    state = {};
  const scheduler = createOperationsScheduler({
    state,
    clock: () => now,
    run(job) {
      const task = deferred();
      requests.push({ job, ...task });
      return task.promise;
    },
    persist() {},
  });
  const initial = scheduler.tick();
  assert.deepEqual(
    requests.map((r) => r.job),
    ["ledger", "snapshot"],
  );
  assert.deepEqual(scheduler.tick(), []);
  requests[0].resolve({ ok: true, capturedAt: new Date(now).toISOString() });
  await initial[0];
  now += 6 * 60000;
  const next = scheduler.tick();
  assert.deepEqual(
    requests.map((r) => r.job),
    ["ledger", "snapshot", "ledger"],
  );
  requests[2].resolve({ ok: true, capturedAt: new Date(now).toISOString() });
  await next[0];
  assert.equal(backupHealth(state, now)[0][1], true);
  requests[1].resolve({
    ok: true,
    capturedAt: new Date(now - 6 * 60000).toISOString(),
  });
  await initial[1];
  const check = scheduler.tick();
  assert.equal(requests[3].job, "check");
  requests[3].resolve({ ok: true });
  await check[0];
  assert.ok(backupHealth(state, now).every(([, healthy]) => healthy));
  scheduler.stop();
  assert.deepEqual(scheduler.tick(), []);
  await scheduler.drain();
});

test("completion time never disguises an old, missing, or future capture as a fresh mirror", async () => {
  const now = Date.now();
  for (const capturedAt of [
    new Date(now - 11 * 60000).toISOString(),
    undefined,
    new Date(now + 1).toISOString(),
  ]) {
    const state = {
      snapshot: resultState(undefined, true, now),
      check: resultState(undefined, true, now),
    };
    const scheduler = createOperationsScheduler({
      state,
      clock: () => now,
      run: async () => ({ ok: true, capturedAt }),
      persist() {},
    });
    await Promise.all(scheduler.tick());
    assert.equal(backupHealth(state, now)[0][1], false);
    if (capturedAt === undefined || Date.parse(capturedAt) > now)
      assert.equal(state.ledger.failures, 1);
    else {
      assert.equal(state.ledger.successAt, now);
      assert.equal(state.ledger.sourceAt, now - 11 * 60000);
      assert.ok(dueJobs(state, now).includes("ledger"));
    }
  }
});

test("legacy and malformed/future state cannot suppress jobs or report healthy backups", () => {
  const now = Date.now();
  for (const at of [undefined, "123", Number.NaN, now + 60000]) {
    const state = Object.fromEntries(
      Object.keys(schedules).map((job) => [
        job,
        { successAt: at, sourceAt: at, retryAt: now + 31 * 60000 },
      ]),
    );
    assert.deepEqual(dueJobs(state, now), ["ledger", "snapshot", "check"]);
    assert.ok(backupHealth(state, now).every(([, healthy]) => !healthy));
  }
  const legacy = { ledger: { successAt: now } };
  assert.ok(dueJobs(legacy, now).includes("ledger"));
  assert.equal(backupHealth(legacy, now)[0][1], false);
});

test("one-shot verification is sequential; failed persistence stops new work", async () => {
  const now = Date.now(),
    jobs = [],
    state = {};
  let active = 0;
  const scheduler = createOperationsScheduler({
    state,
    clock: () => now,
    async run(job) {
      active++;
      assert.equal(active, 1);
      jobs.push(job);
      await Promise.resolve();
      active--;
      return { ok: true, capturedAt: new Date(now).toISOString() };
    },
    persist() {},
  });
  await scheduler.once();
  assert.deepEqual(jobs, ["ledger", "snapshot", "check"]);
  let failed = false;
  const bad = createOperationsScheduler({
    state: {},
    clock: () => now,
    run: async () => ({ ok: true, capturedAt: new Date(now).toISOString() }),
    persist() {
      throw new Error("disk unavailable");
    },
    onError() {
      failed = true;
    },
  });
  await Promise.all(bad.tick());
  assert.equal(failed, true);
  assert.throws(() => bad.tick(), /disk unavailable/);
  await assert.rejects(bad.drain(), /disk unavailable/);
});
