"use server";

import { cookies } from "next/headers";
import { isLocale, localeCookie, type Locale } from "./config";

export async function setLocale(locale: Locale) {
  if (!isLocale(locale)) throw new Error("Unsupported locale");
  (await cookies()).set(localeCookie, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
