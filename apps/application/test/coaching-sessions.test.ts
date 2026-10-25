import assert from "node:assert/strict";
import test from "node:test";
import {
  coachingSessionBalance,
  groupCoachingSessions,
  nextCoachingSession,
} from "../../../packages/ui/src/lib/coaching-sessions";
import { coachingSessionFixtures } from "./fixtures/coaching-sessions";

const now = new Date("2026-10-25T10:00:00Z");
const { sessions } = coachingSessionFixtures(now);

test("a group session with several students occupies one timeline stop", () => {
  const group = {
    ...sessions[2]!,
    id: "another-reservation",
    displayName: "Another student",
    status: "no_show",
  };
  const result = groupCoachingSessions([...sessions, group]);
  assert.equal(result.length, sessions.length);
  assert.equal(result[2]!.reservations.length, 2);
  assert.equal(result[2]!.status, "confirmed");
  assert.equal(
    groupCoachingSessions([{ ...sessions[2]!, status: "completed" }, group])[0]!
      .status,
    "completed",
  );
});

test("cancelled occurrences stay cancelled and cannot be highlighted as next", () => {
  const cancelled = {
    ...sessions[4]!,
    status: "confirmed",
    startAt: now.toISOString(),
  };
  const groups = groupCoachingSessions([cancelled, sessions[3]!]);
  assert.equal(groups[0]!.status, "cancelled");
  assert.equal(nextCoachingSession(groups, +now), sessions[3]!.occurrenceId);
});

test("the next session includes one already underway and ignores list sorting", () => {
  assert.equal(
    nextCoachingSession(groupCoachingSessions([...sessions].reverse()), +now),
    sessions[2]!.occurrenceId,
  );
  assert.equal(
    nextCoachingSession(groupCoachingSessions(sessions.slice(0, 2)), +now),
    undefined,
  );
});

test("available balance excludes both consumed and reserved credits", () => {
  assert.equal(coachingSessionBalance(12, 5, 2), 5);
  assert.equal(coachingSessionBalance(4, 5, 2), 0);
  assert.equal(coachingSessionBalance(null, 5, 2), null);
});
