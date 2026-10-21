import { test } from "node:test";
import assert from "node:assert/strict";
import { trainingIdentity } from "../../../packages/ui/src/training/identity";
import { replaceRemainingSets } from "../../../packages/ui/src/training/workout-state";
import type { Prescription, SetLog } from "@repo/api/profile";
const prescription: Prescription = {
  id: "p",
  exerciseId: "squat",
  sets: 3,
  reps: 10,
  seconds: null,
  load: 10,
  restSeconds: 30,
  note: "",
  group: "single",
  groupId: "",
};
const completed: SetLog = {
  prescriptionId: "p",
  exerciseId: "squat",
  set: 1,
  reps: 9,
  seconds: null,
  load: 12,
  rpe: 7,
  done: true,
};
test("reconnection retains the downloaded workout account while its identity is revalidated", () => {
  assert.equal(trainingIdentity(undefined, "athlete", 0), "athlete");
  assert.equal(trainingIdentity(undefined, "athlete", 503), "athlete");
  assert.equal(trainingIdentity("athlete", "athlete"), "athlete");
});
test("an authoritative denial never reopens cached training, including stale successful account data", () => {
  for (const status of [401, 403, 404])
    assert.equal(trainingIdentity("athlete", "athlete", status), "");
});
test("a different online account waits for previous account storage retirement", () => {
  assert.equal(trainingIdentity(undefined, "athlete"), "");
  assert.equal(
    trainingIdentity(undefined, "athlete", undefined, true),
    "athlete",
  );
  assert.equal(trainingIdentity("coach", "athlete"), "");
  assert.equal(trainingIdentity("coach", "coach"), "coach");
  assert.equal(trainingIdentity(undefined, ""), "");
});
test("substitution preserves completed performance and applies to every remaining set", () => {
  const other = { ...completed, prescriptionId: "another" };
  const logs = [
    completed,
    { ...completed, set: 2, reps: 8, done: false },
    other,
  ];
  const replaced = replaceRemainingSets(logs, prescription, "goblet-squat");
  assert.deepEqual(replaced[0], completed);
  assert.deepEqual(
    replaced.find((l) => l.prescriptionId === "another"),
    other,
  );
  assert.equal(
    replaced.find((l) => l.prescriptionId === "p" && l.set === 2)?.exerciseId,
    "goblet-squat",
  );
  assert.equal(
    replaced.find((l) => l.prescriptionId === "p" && l.set === 2)?.reps,
    8,
  );
  assert.equal(
    replaced.find((l) => l.prescriptionId === "p" && l.set === 3)?.exerciseId,
    "goblet-squat",
  );
  assert.equal(logs[1].exerciseId, "squat");
});
test("replacing again never duplicates pending sets or rewrites a completed alternative", () => {
  const first = replaceRemainingSets([completed], prescription, "goblet-squat");
  first[1] = { ...first[1], done: true, reps: 10, load: 8 };
  const second = replaceRemainingSets(first, prescription, "squat");
  assert.equal(second.length, 3);
  assert.equal(second[1].exerciseId, "goblet-squat");
  assert.equal(second[2].exerciseId, "squat");
});
