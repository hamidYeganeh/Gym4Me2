"use client";

import type {} from "./types";

import {
  NextIntlClientProvider,
  useFormatter as useIntlFormatter,
  useLocale as useIntlLocale,
  useMessages as useIntlMessages,
  useTranslations as useIntlTranslations,
} from "next-intl";

// Local public symbols keep editor auto-imports on the workspace API.
export const I18nProvider = NextIntlClientProvider;
export const useTranslations = useIntlTranslations;
export const useLocale = useIntlLocale;
export const useFormatter = useIntlFormatter;
export { locales, defaultLocale, getLocaleConfig, isLocale } from "./config";
export type { Locale } from "./config";

export const useMessages = useIntlMessages;
