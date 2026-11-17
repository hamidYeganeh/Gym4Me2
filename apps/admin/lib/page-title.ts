import { getLocale } from "@repo/i18n/server";

export function pageTitle(farsi: string, english: string) {
  return async () => ({ title: (await getLocale()) === "fa" ? farsi : english });
}
