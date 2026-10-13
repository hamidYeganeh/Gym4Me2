import { PageTransitions } from "@repo/ui/page-transitions";
import { ApiProvider } from "@repo/api/provider";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  NextIntlClientProvider,
  getDirection,
  isLocale,
  defaultLocale,
} from "@repo/i18n";
import { getLocale, getTranslations } from "@repo/i18n/server";
import { iranSansX } from "@repo/theme/fonts";
import { ThemeProvider } from "@repo/theme/provider";
import { DirectionProvider } from "@repo/ui/kit/Direction";
import { TooltipProvider } from "@repo/ui/kit/Tooltip";
import { Toaster } from "@repo/ui/kit/Sonner";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return {
    title: { default: t("adminTitle"), template: t("adminTemplate") },
    description: t("adminDescription"),
  };
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
      <body className="min-h-dvh antialiased">
        <NextIntlClientProvider>
          <ApiProvider application="admin" locale={locale}>
            <ThemeProvider>
              <DirectionProvider dir={direction}>
                <TooltipProvider>
                  <PageTransitions>{children}</PageTransitions>
                  <Toaster dir={direction} />
                </TooltipProvider>
              </DirectionProvider>
            </ThemeProvider>
          </ApiProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
