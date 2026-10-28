import assert from "node:assert/strict";
import { test } from "node:test";
import type { AnalyticsReport } from "@repo/api/analytics";
import {
  overviewModel,
  overviewMoney,
  overviewPeriods,
} from "../../../packages/ui/src/lib/dashboard-overview";

const report = (data: AnalyticsReport["data"] = []): AnalyticsReport => ({
  filters: { from: "2026-10-01", to: "2026-10-07", interval: "day" },
  timezone: "Asia/Tehran",
  generatedAt: "2026-10-07T12:00:00Z",
  data,
  statuses: [],
  platform: [],
  growth: null,
  options: { branches: [], services: [] },
});

test("dashboard periods use the Tehran day and adjacent equal calendar windows", () => {
  // UTC is still October 27; it is October 28 in Tehran.
  const now = new Date("2026-10-27T21:00:00Z");
  for (const days of [7, 30, 90] as const) {
    const { current, previous } = overviewPeriods(days, now);
    assert.equal(current.to, "2026-10-28");
    const length = (from: string, to: string) =>
      (Date.parse(to) - Date.parse(from)) / 86400000 + 1;
    assert.equal(length(current.from, current.to), days);
    assert.equal(length(previous.from, previous.to), days);
    assert.equal(Date.parse(current.from) - Date.parse(previous.to), 86400000);
  }
  assert.equal(
    overviewPeriods(7, new Date("2026-01-01T00:00:00Z")).previous.to,
    "2025-12-25",
  );
});

test("net collections retain money precision and can be negative", () => {
  const model = overviewModel(
    report([
      {
        bucket: "2026-10-01",
        metric: "collectedMinor",
        value: "999999999999999999",
      },
      { bucket: "2026-10-02", metric: "collectedMinor", value: "12" },
      { bucket: "2026-10-02", metric: "refundedMinor", value: "16" },
    ]),
  );
  assert.equal(model.netCollected, BigInt("999999999999999995"));
  assert.equal(
    overviewMoney(model.netCollected, "en"),
    "99,999,999,999,999,999.5",
  );
  const negative = overviewModel(
    report([{ bucket: "2026-10-01", metric: "refundedMinor", value: "19" }]),
  );
  assert.equal(overviewMoney(negative.netCollected, "en"), "−1.9");
  assert.equal(overviewMoney(BigInt(19), "fa"), "۱٫۹");
});

test("occupancy uses available session capacity and distinguishes missing from zero", () => {
  assert.equal(overviewModel(report()).occupancy, null);
  const rows: AnalyticsReport["data"] = [
    { bucket: "2026-10-01", metric: "capacity", value: "10" },
    { bucket: "2026-10-02", metric: "capacity", value: "20" },
  ];
  assert.equal(overviewModel(report(rows)).occupancy, 0);
  assert.equal(
    overviewModel(
      report([
        ...rows,
        { bucket: "2026-10-01", metric: "occupied", value: "10" },
      ]),
    ).occupancy,
    33.3,
  );
});

test("workout event dates stay independent and missing days are zero-filled", () => {
  const model = overviewModel(
    report([
      { bucket: "2026-10-02", metric: "sharedWorkouts", value: "1" },
      { bucket: "2026-10-04", metric: "reviewedWorkouts", value: "3" },
    ]),
  );
  assert.equal(model.buckets.length, 7);
  assert.equal(model.buckets[0]?.sharedWorkouts, 0);
  assert.equal(model.buckets[1]?.sharedWorkouts, 1);
  assert.equal(model.buckets[1]?.reviewedWorkouts, 0);
  assert.equal(model.buckets[3]?.reviewedWorkouts, 3);
  // Reviews can exceed completions in a period; no fake backlog/rate is derived.
  assert.equal(model.totals.reviewedWorkouts, BigInt(3));
});
