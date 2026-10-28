import type { AnalyticsFilters, AnalyticsReport } from "@repo/api/analytics";
import { analyticsBuckets, analyticsTotals } from "./analytics-data";

export type OverviewPeriod = 7 | 30 | 90;

/** Calendar windows match the API's inclusive Tehran dates, including today. */
export function overviewPeriods(days: OverviewPeriod, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value;
  const today = `${part("year")}-${part("month")}-${part("day")}`;
  const shift = (date: string, offset: number) => {
    const value = new Date(`${date}T12:00:00Z`);
    value.setUTCDate(value.getUTCDate() + offset);
    return value.toISOString().slice(0, 10);
  };
  const current: AnalyticsFilters = {
    from: shift(today, 1 - days),
    to: today,
    interval: "day",
  };
  const previous: AnalyticsFilters = {
    from: shift(current.from, -days),
    to: shift(current.from, -1),
    interval: "day",
  };
  return { current, previous };
}

export function overviewModel(report: AnalyticsReport) {
  const totals = analyticsTotals(report.data);
  const total = (key: keyof typeof totals) => totals[key] ?? BigInt(0);
  const capacity = total("capacity"),
    occupied = total("occupied");
  return {
    totals,
    netCollected: total("collectedMinor") - total("refundedMinor"),
    capacity,
    occupied,
    // A zero denominator means unavailable, not a measured 0% occupancy.
    occupancy:
      capacity > BigInt(0)
        ? Number((occupied * BigInt(1000)) / capacity) / 10
        : null,
    buckets: analyticsBuckets(report).map((row) => ({
      ...row,
      sessions: Number(row.values.sessions ?? 0),
      sharedWorkouts: Number(row.values.sharedWorkouts ?? 0),
      reviewedWorkouts: Number(row.values.reviewedWorkouts ?? 0),
      // Numbers are for chart geometry only; money calculations/tooltips retain bigint.
      collectionsPlot: Number(row.collectedMinor) / 10,
      refundsPlot: Number(row.refundedMinor) / 10,
    })),
  };
}

/** Preserve the rial remainder when presenting amounts in tomans. */
export function overviewMoney(rials: bigint, locale: string) {
  const absolute = rials < BigInt(0) ? -rials : rials;
  const whole = new Intl.NumberFormat(locale).format(absolute / BigInt(10));
  const fraction = absolute % BigInt(10);
  const separator =
    new Intl.NumberFormat(locale)
      .formatToParts(1.1)
      .find((p) => p.type === "decimal")?.value ?? ".";
  return `${rials < BigInt(0) ? "−" : ""}${whole}${fraction ? `${separator}${new Intl.NumberFormat(locale).format(fraction)}` : ""}`;
}
