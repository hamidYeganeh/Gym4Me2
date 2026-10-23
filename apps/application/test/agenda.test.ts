import { test } from "node:test";
import assert from "node:assert/strict";
import { agendaDay, agendaGroups } from "../../../packages/ui/src/lib/agenda";
test("schedule groups at Tehran midnight and preserves chronological order", () => {
  const items = [
    { id: "tomorrow", startAt: "2026-10-24T08:00:00Z" },
    { id: "evening", startAt: "2026-10-23T20:45:00Z" },
    { id: "past", startAt: "2026-10-23T19:00:00Z" },
    { id: "bad", startAt: "invalid" },
  ];
  const now = new Date("2026-10-23T21:00:00Z");
  assert.equal(agendaDay(now), "2026-10-24");
  assert.deepEqual(
    agendaGroups(items, "today", now).map((g) => g.entries.map((i) => i.id)),
    [["evening", "tomorrow"]],
  );
});
test("seven-day window includes its last day and excludes the next", () => {
  const now = new Date("2026-10-24T08:00:00Z");
  const entries = [
    { startAt: "2026-10-30T20:00:00Z" },
    { startAt: "2026-10-30T21:00:00Z" },
  ];
  assert.equal(
    agendaGroups(entries, "week", now).flatMap((g) => g.entries).length,
    1,
  );
  assert.equal(
    agendaGroups(entries, "allDates", now).flatMap((g) => g.entries).length,
    2,
  );
});
