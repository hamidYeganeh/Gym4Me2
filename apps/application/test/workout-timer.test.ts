import assert from "node:assert/strict";
import test from "node:test";
import { initialClock, clockSeconds, elapsedAt, toggleClock, restoreClock } from "../../../packages/ui/src/training/timer-state";
test("elapsed clock catches up after background throttling and excludes paused time", () => {
  let clock = toggleClock(initialClock(), 1000);
  assert.equal(clockSeconds(clock, 61000), 60);
  clock = toggleClock(clock, 61500);
  assert.equal(elapsedAt(clock, 100000), 60500);
  clock = toggleClock(clock, 100000);
  assert.equal(clockSeconds(clock, 101500), 62);
});
test("countdowns finish at zero without looping, and restart only on request", () => {
  let clock = toggleClock(initialClock(30), 1000);
  assert.equal(clockSeconds(clock, 1200), 30);
  assert.equal(clockSeconds(clock, 31000), 0);
  assert.equal(clockSeconds(clock, 80000), 0);
  clock = toggleClock(clock, 80000);
  clock = toggleClock(clock, 90000);
  assert.equal(clockSeconds(clock, 90000), 30);
});
test("reload restores the deadline and rejects corrupt stored clocks", () => {
  const saved = restoreClock(JSON.parse(JSON.stringify(toggleClock(initialClock(60), 1000))));
  assert.ok(saved);
  assert.equal(clockSeconds(saved, 46000), 15);
  for (const value of [null, {}, {elapsed:-1,duration:0,startedAt:null}, {elapsed:0,duration:4000,startedAt:null}]) assert.equal(restoreClock(value), null);
});
