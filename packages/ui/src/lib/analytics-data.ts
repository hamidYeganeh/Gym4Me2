import type {
  AnalyticsFilters,
  AnalyticsMetric,
  AnalyticsReport,
} from "@repo/api/analytics";
export function rangeValid(f: AnalyticsFilters) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.from) || !/^\d{4}-\d{2}-\d{2}$/.test(f.to))
    return false;
  const from = Date.parse(f.from),
    to = Date.parse(f.to);
  if (
    !Number.isFinite(from) ||
    !Number.isFinite(to) ||
    new Date(from).toISOString().slice(0, 10) !== f.from ||
    new Date(to).toISOString().slice(0, 10) !== f.to
  )
    return false;
  const days = (to - from) / 86400000;
  return days >= 0 && days <= 730 && (f.interval !== "day" || days <= 92);
}
export function analyticsTotals(data: AnalyticsReport["data"]) {
  const result: Partial<Record<AnalyticsMetric, bigint>> = {};
  for (const row of data)
    result[row.metric] = (result[row.metric] ?? BigInt(0)) + BigInt(row.value);
  return result;
}
export function analyticsBuckets(report: AnalyticsReport) {
  const { from, to, interval } = report.filters;
  const cursor = new Date(`${from}T00:00:00Z`);
  if (interval === "week")
    cursor.setUTCDate(cursor.getUTCDate() - ((cursor.getUTCDay() + 6) % 7));
  if (interval === "month") cursor.setUTCDate(1);
  const rows: {
    date: string;
    bookings: number;
    attendance: number;
    collectedMinor: string;
    refundedMinor: string;
    values: Partial<Record<AnalyticsMetric, string>>;
  }[] = [];
  const byDate = new Map<string, Partial<Record<AnalyticsMetric, string>>>();
  for (const row of report.data) {
    const values = byDate.get(row.bucket) ?? {};
    values[row.metric] = row.value;
    byDate.set(row.bucket, values);
  }
  while (cursor.toISOString().slice(0, 10) <= to && rows.length < 732) {
    const date = cursor.toISOString().slice(0, 10),
      values = byDate.get(date) ?? {};
    rows.push({
      date,
      bookings: Number(values.bookings ?? 0),
      attendance: Number(values.attendance ?? 0),
      collectedMinor: values.collectedMinor ?? "0",
      refundedMinor: values.refundedMinor ?? "0",
      values,
    });
    if (interval === "month") cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    else cursor.setUTCDate(cursor.getUTCDate() + (interval === "week" ? 7 : 1));
  }
  return rows;
}
/** Neutralize spreadsheet formulas before quoting/escaping exported cells. */
export function csvCell(value: unknown) {
  let text = String(value ?? "");
  // Leading control characters can conceal spreadsheet formulas.
  // eslint-disable-next-line no-control-regex
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
