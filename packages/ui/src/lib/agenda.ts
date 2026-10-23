/** Tehran dates are shared by booking receipts and the personal schedule. */
export function agendaDay(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (!Number.isFinite(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export type AgendaView = "today" | "week" | "allDates";
export function agendaGroups<T extends { startAt: string }>(
  items: T[],
  view: AgendaView,
  now: Date,
) {
  const today = agendaDay(now)!;
  const last = new Date(`${today}T12:00:00Z`);
  last.setUTCDate(last.getUTCDate() + 6);
  const until = agendaDay(last)!;
  const groups = new Map<string, T[]>();
  for (const item of [...items].sort(
    (a, b) => Date.parse(a.startAt) - Date.parse(b.startAt),
  )) {
    const day = agendaDay(item.startAt);
    if (
      !day ||
      day < today ||
      (view === "today" && day !== today) ||
      (view === "week" && day > until)
    )
      continue;
    groups.set(day, [...(groups.get(day) ?? []), item]);
  }
  return [...groups.entries()].map(([day, entries]) => ({ day, entries }));
}
