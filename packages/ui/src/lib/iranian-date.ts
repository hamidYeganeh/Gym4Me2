import { normalizeLoginDigits } from "../account/login-validation";

const persian = new Intl.DateTimeFormat("en-US-u-ca-persian", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "UTC",
});
function calendarKey(date: Date) {
  const parts = persian.formatToParts(date);
  const get = (part: string) => parts.find((p) => p.type === part)?.value ?? "";
  return `${get("year").padStart(4, "0")}/${get("month")}/${get("day")}`;
}
export function displayLocalDate(iso: string, locale = "fa") {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const date = new Date(`${iso}T12:00:00Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== iso
  )
    return "";
  return locale === "fa"
    ? calendarKey(date).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!)
    : iso;
}
export function parseLocalDate(value: string, locale = "fa"): string {
  const normalized = normalizeLoginDigits(value).trim().replace(/-/g, "/");
  const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(normalized);
  if (!match) return "";
  const year = Number(match[1]),
    month = Number(match[2]),
    day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  const target = `${year}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`;
  if (locale !== "fa") {
    const iso = target.replaceAll("/", "-"),
      date = new Date(`${iso}T12:00:00Z`);
    return Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === iso
      ? iso
      : "";
  }
  if (year < 1100 || year > 1700) return "";
  let low = Math.floor(Date.UTC(year + 621, 0, 1) / 86400000),
    high = Math.floor(Date.UTC(year + 622, 11, 31) / 86400000);
  while (low <= high) {
    const mid = Math.floor((low + high) / 2),
      date = new Date(mid * 86400000 + 43200000),
      key = calendarKey(date);
    if (key === target) return date.toISOString().slice(0, 10);
    if (key < target) low = mid + 1;
    else high = mid - 1;
  }
  return "";
}
