import test from "node:test";
import assert from "node:assert/strict";
import { dueJobs, resultState, schedules } from "./operations-worker.mjs";
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
