"use client";

import type { ReactNode } from "react";
import {
  defaultLocale,
  getDirection,
  useLocale,
  useTranslations,
} from "@repo/i18n";
import { ClientLocaleProvider } from "@repo/i18n/client-provider";
import { ThemeProvider } from "@repo/theme/provider";
import { DirectionProvider } from "@repo/ui/kit/Direction";
import { ApiProvider } from "@repo/api/provider";
import { Toaster } from "@repo/ui/kit/Sileo";

function WebsiteDirection({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const t = useTranslations("Website");
  return (
    <ApiProvider application="application" locale={locale}>
      <DirectionProvider dir={getDirection(locale)}>
        <a className="skip-link" href="#main-content">
          {t("skip")}
        </a>
        {children}
        <Toaster dir={getDirection(locale)} />
      </DirectionProvider>
    </ApiProvider>
  );
}
export function WebsiteProviders({ children }: { children: ReactNode }) {
  return (
    <ClientLocaleProvider initialLocale={defaultLocale}>
      <ThemeProvider>
        <WebsiteDirection>{children}</WebsiteDirection>
      </ThemeProvider>
    </ClientLocaleProvider>
  );
}
