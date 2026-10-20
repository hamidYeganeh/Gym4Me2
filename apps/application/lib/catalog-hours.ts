import { getTranslator } from "@repo/i18n/messages";

export function catalogMinute(value: number, locale: string) {
  const number = new Intl.NumberFormat(locale, { useGrouping: false });
  return [Math.floor(value / 60) % 24, value % 60]
    .map((part) => number.format(part).padStart(2, number.format(0)))
    .join(":");
}

/** A branch exception is a local calendar day, not an instant to shift by its zone. */
export function catalogDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

/** An end at midnight belongs to the next day too, not only ends after midnight. */
export function catalogInterval(
  interval: { startMinute: number; endMinute: number },
  locale: string,
) {
  const nextDay =
    interval.endMinute >= 1440
      ? ` ${getTranslator(locale)("Catalog.nextDay")}`
      : "";
  return `${catalogMinute(interval.startMinute, locale)}–${catalogMinute(interval.endMinute, locale)}${nextDay}`;
}
