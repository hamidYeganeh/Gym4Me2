import { AppProviders } from "../components/app-providers";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { getDirection, isLocale, defaultLocale } from "@repo/i18n";
import { getLocale, getTranslations } from "@repo/i18n/server";
import { iranSansX } from "@repo/theme/fonts";
import "./globals.css";

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
      <body className="min-h-dvh select-none antialiased">
        <div className="application-frame mx-auto w-full max-w-xl">
          <AppProviders locale={locale}>{children}</AppProviders>
        </div>
      </body>
    </html>
  );
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
