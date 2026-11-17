export const locales = ["en", "fa"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fa";
export const localeCookieName = "gym4me-locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.some((locale) => locale === value);
}

export function getLocaleConfig(locale: Locale): {
  lang: Locale;
  dir: "rtl" | "ltr";
} {
  return {
    lang: locale,
    dir: locale === "fa" ? "rtl" : "ltr",
  };
}
