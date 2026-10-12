export const locales = ["fa", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fa";
export const localeCookie = "gym4me-locale";
export const timeZone = "Asia/Tehran";
export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.includes(value as Locale);
}
export function getDirection(locale: Locale) {
  return locale === "fa" ? "rtl" : "ltr";
}
