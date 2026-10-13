import { createTranslator } from "next-intl";
import fa from "./messages/fa.json";
import en from "./messages/en.json";
import { defaultLocale, isLocale, timeZone } from "./config";

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];
export type TranslationKey = Paths<typeof fa>;

export function getLocaleMessages(value: string) {
  return value === "en" ? en : fa;
}

/** Pure locale-explicit adapter for preview data and other non-React consumers. */
export function getTranslator(value: string) {
  const locale = isLocale(value) ? value : defaultLocale;
  return createTranslator({
    locale,
    messages: getLocaleMessages(locale),
    timeZone,
  });
}

export function isTranslationKey(value: string): value is TranslationKey {
  let item: unknown = fa;
  for (const part of value.split(".")) {
    if (!item || typeof item !== "object" || !(part in item)) return false;
    item = (item as Record<string, unknown>)[part];
  }
  return typeof item === "string";
}
