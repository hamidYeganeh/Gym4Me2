import assert from "node:assert/strict";
import test from "node:test";
import {
  calendarMonth,
  shiftCalendarDay,
  shiftCalendarMonth,
  validCalendarDay,
} from "../../../packages/ui/src/lib/calendar-month";

test("Gregorian leap months and month navigation clamp the selected day", () => {
  assert.equal(calendarMonth("2024-02-29", "en").length, 29);
  assert.equal(calendarMonth("2026-02-20", "en").length, 28);
  assert.equal(shiftCalendarMonth("2024-03-31", -1, "en"), "2024-02-29");
  assert.equal(shiftCalendarMonth("2026-12-31", 1, "en"), "2027-01-31");
});
test("Persian months cross Nowruz and include leap Esfand", () => {
  assert.equal(calendarMonth("2026-03-21", "fa").start, "2026-03-21");
  assert.equal(calendarMonth("2026-03-21", "fa").length, 31);
  assert.equal(calendarMonth("2025-03-20", "fa").length, 30);
  assert.equal(shiftCalendarMonth("2025-03-20", 1, "fa"), "2025-04-19");
});
test("month grids use Saturday in Persian and Monday in English with complete weeks", () => {
  const fa = calendarMonth("2026-10-24", "fa");
  assert.equal(fa.start, "2026-10-23");
  assert.equal(new Date(`${fa.days[0]!.key}T12:00:00Z`).getUTCDay(), 6);
  assert.equal(fa.days.length % 7, 0);
  assert.equal(fa.days.filter((d) => !d.outside).length, fa.length);
  const en = calendarMonth("2026-10-24", "en");
  assert.equal(new Date(`${en.days[0]!.key}T12:00:00Z`).getUTCDay(), 1);
  assert.equal(en.days.filter((d) => !d.outside).length, 31);
});
test("ISO day validation rejects normalized overflow dates and arithmetic ignores host time zones", () => {
  assert.equal(validCalendarDay("2026-02-29"), false);
  assert.equal(validCalendarDay("2024-02-29"), true);
  assert.equal(validCalendarDay("2026-13-01"), false);
  assert.equal(validCalendarDay("invalid"), false);
  assert.equal(shiftCalendarDay("2026-12-31", 1), "2027-01-01");
  assert.equal(shiftCalendarDay("2026-03-01", -1), "2026-02-28");
});
