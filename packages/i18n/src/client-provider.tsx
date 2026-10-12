"use client";
import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { NextIntlClientProvider } from "next-intl";
import {
  getDirection,
  isLocale,
  localeCookie,
  timeZone,
  type Locale,
} from "./config";
import fa from "./messages/fa.json";
import en from "./messages/en.json";
const eventName = "gym4me:locale";
const LocaleContext = createContext<((locale: Locale) => Promise<void>) | null>(
  null,
);
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(eventName, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(eventName, listener);
  };
}
let memoryLocale: Locale | undefined;
async function changeLocale(locale: Locale) {
  if (!isLocale(locale)) throw new Error("Unsupported locale");
  memoryLocale = locale;
  try {
    localStorage.setItem(localeCookie, locale);
  } catch {
    /* Session state works if storage is unavailable. */
  }
  window.dispatchEvent(new Event(eventName));
}
/** Works with a static native export: switching language never calls a server action. */
export function ClientLocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const locale = useSyncExternalStore(
    subscribe,
    () => {
      try {
        const saved = localStorage.getItem(localeCookie);
        return isLocale(saved) ? saved : (memoryLocale ?? initialLocale);
      } catch {
        return memoryLocale ?? initialLocale;
      }
    },
    () => initialLocale,
  );
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = getDirection(locale);
  }, [locale]);
  return (
    <LocaleContext.Provider value={changeLocale}>
      <NextIntlClientProvider
        locale={locale}
        messages={locale === "fa" ? fa : en}
        timeZone={timeZone}
      >
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
export function useChangeLocale() {
  const change = useContext(LocaleContext);
  if (!change) throw new Error("useChangeLocale requires ClientLocaleProvider");
  return change;
}
