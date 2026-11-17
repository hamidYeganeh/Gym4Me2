import "server-only";

import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

import { defaultLocale, isLocale, localeCookieName } from "./config";

import type {} from "./types";

import { loadMessages } from "./messages/load";

export default getRequestConfig(async () => {
  const requested = (await cookies()).get(localeCookieName)?.value;
  const locale = isLocale(requested) ? requested : defaultLocale;
  return { locale, messages: await loadMessages(locale), timeZone: "UTC" };
});
