import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale, localeCookie, timeZone } from "./config";
import fa from "./messages/fa.json";
import en from "./messages/en.json";

export default getRequestConfig(async () => {
  const value =
    process.env.NEXT_PUBLIC_NATIVE_EXPORT === "true"
      ? undefined
      : (await cookies()).get(localeCookie)?.value;
  const locale = isLocale(value) ? value : defaultLocale;
  return { locale, messages: locale === "fa" ? fa : en, timeZone };
});
