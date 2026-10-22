import assert from "node:assert/strict";
import { test } from "node:test";
import {
  analyticsBuckets,
  analyticsTotals,
  csvCell,
  rangeValid,
} from "../../../packages/ui/src/lib/analytics-data";
import type { AnalyticsReport } from "@repo/api/analytics";
test("chart fills missing count buckets and preserves full money precision", () => {
  const report = {
    filters: { from: "2026-05-01", to: "2026-05-03", interval: "day" },
    data: [
      {
        bucket: "2026-05-01",
        metric: "collectedMinor",
        value: "999999999999999999",
      },
      { bucket: "2026-05-01", metric: "bookings", value: "2" },
    ],
  } as AnalyticsReport;
  assert.equal(
    analyticsTotals(report.data).collectedMinor,
    BigInt("999999999999999999"),
  );
  const buckets = analyticsBuckets(report);
  assert.equal(buckets.length, 3);
  assert.equal(buckets[1]?.bookings, 0);
  assert.equal(buckets[0]?.bookings, 2);
});
test("weekly reports start at Monday and don't duplicate buckets", () => {
  const report = {
    filters: { from: "2026-05-01", to: "2026-05-10", interval: "week" },
    data: [],
  } as unknown as AnalyticsReport;
  assert.deepEqual(
    analyticsBuckets(report).map((b) => b.date),
    ["2026-04-27", "2026-05-04"],
  );
});
test("date validation rejects rollover, reversed and overly dense ranges", () => {
  assert.equal(
    rangeValid({ from: "2026-02-30", to: "2026-03-02", interval: "day" }),
    false,
  );
  assert.equal(
    rangeValid({ from: "2026-01-01", to: "2026-12-31", interval: "day" }),
    false,
  );
  assert.equal(
    rangeValid({ from: "2026-01-01", to: "2026-12-31", interval: "month" }),
    true,
  );
});
test("CSV escapes quotes and neutralizes formula injection", () => {
  assert.equal(csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  assert.equal(csvCell("\t+SUM(1,2)"), '"\'\t+SUM(1,2)"');
  assert.equal(csvCell("باشگاه، تهران"), '"باشگاه، تهران"');
});
