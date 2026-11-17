"use server";

import { cookies } from "next/headers";

import type { Locale } from "./config";

import { isLocale, localeCookieName } from "./config";

export async function setLocale(locale: Locale) {
  if (!isLocale(locale)) throw new Error("Unsupported locale");

  (await cookies()).set(localeCookieName, locale, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
