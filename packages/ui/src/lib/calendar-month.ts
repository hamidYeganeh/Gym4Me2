/** ISO day arithmetic stays at UTC noon; presentation follows the selected calendar. */
export function validCalendarDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value;
}
export function shiftCalendarDay(day: string, amount: number) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
function parts(day: string, locale: string) {
  const values = new Intl.DateTimeFormat(
    locale === "fa"
      ? "fa-IR-u-ca-persian-nu-latn"
      : "en-US-u-ca-gregory-nu-latn",
    {
      timeZone: "UTC",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    },
  ).formatToParts(new Date(`${day}T12:00:00Z`));
  const get = (type: "year" | "month" | "day") =>
    Number(values.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}
export function calendarMonth(day: string, locale: string) {
  const current = parts(day, locale);
  const start = shiftCalendarDay(day, 1 - current.day);
  let length = 28;
  while (
    length < 32 &&
    parts(shiftCalendarDay(start, length), locale).month === current.month
  )
    length++;
  const weekStart = locale === "fa" ? 6 : 1;
  const leading =
    (new Date(`${start}T12:00:00Z`).getUTCDay() - weekStart + 7) % 7;
  return {
    start,
    length,
    leading,
    weekStart,
    days: Array.from(
      { length: Math.ceil((leading + length) / 7) * 7 },
      (_, i) => {
        const key = shiftCalendarDay(start, i - leading);
        return {
          key,
          day: parts(key, locale).day,
          outside: i < leading || i >= leading + length,
        };
      },
    ),
  };
}
export function shiftCalendarMonth(
  day: string,
  amount: number,
  locale: string,
) {
  let anchor = day;
  const wanted = parts(day, locale).day;
  for (let i = 0; i < Math.abs(amount); i++) {
    const month = calendarMonth(anchor, locale);
    anchor = shiftCalendarDay(month.start, amount < 0 ? -1 : month.length);
  }
  const target = calendarMonth(anchor, locale);
  return shiftCalendarDay(target.start, Math.min(wanted, target.length) - 1);
}
