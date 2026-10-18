import { BusinessProviders } from "./providers";
import { ClientLocaleProvider } from "@repo/i18n/client-provider";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getDirection, isLocale, defaultLocale } from "@repo/i18n";
import { getLocale, getTranslations } from "@repo/i18n/server";
import { iranSansX } from "@repo/theme/fonts";
import "./globals.css";
import "@repo/ui/focus.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return { title: t("brand"), description: t("description") };
}

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const value = await getLocale();
  const locale = isLocale(value) ? value : defaultLocale;
  const direction = getDirection(locale);
  return (
    <html
      lang={locale}
      dir={direction}
      className={iranSansX.variable}
      suppressHydrationWarning
    >
      <body data-gym-focus="business" className="min-h-dvh antialiased">
        <ClientLocaleProvider initialLocale={locale}>
          <BusinessProviders>{children}</BusinessProviders>
        </ClientLocaleProvider>
      </body>
    </html>
  );
}
