import assert from "node:assert/strict";
import test from "node:test";
import { rescheduleOptions } from "../lib/reschedule-options";
import { publicServiceFixtures } from "./fixtures/public-services";

test("rescheduling excludes the current, past, cancelled, full and blocked sessions", () => {
  const now = Date.parse("2026-10-27T10:00:00Z");
  const base = publicServiceFixtures(new Date(now))[0]!.occurrences[0]!;
  const choices = [
    { ...base, id: "current" },
    { ...base, id: "available" },
    { ...base, id: "past", startAt: new Date(now).toISOString() },
    { ...base, id: "invalid", startAt: "invalid" },
    { ...base, id: "cancelled", status: "cancelled" },
    { ...base, id: "full", remaining: 0 },
    { ...base, id: "blocked", resourceAvailable: false },
  ];
  assert.deepEqual(
    rescheduleOptions(choices, "current", 1, now).map((o) => o.id),
    ["available"],
  );
  assert.deepEqual(
    rescheduleOptions([{ ...base, remaining: 2 }], "current", 3, now),
    [],
  );
});
