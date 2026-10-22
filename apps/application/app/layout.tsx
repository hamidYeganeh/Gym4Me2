import { AppProviders } from "../components/app-providers";
import { Ph0Trace } from "../components/qa/ph0-trace";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { getDirection, isLocale, defaultLocale } from "@repo/i18n";
import { getLocale, getTranslations } from "@repo/i18n/server";
import { iranSansX } from "@repo/theme/fonts";
import "./globals.css";
import "@repo/ui/focus.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return {
    title: t("brand"),
    description: t("description"),
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, title: "Gym4Me", statusBarStyle: "default" },
    icons: { apple: "/icons/icon-180.png" },
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
      <body
        data-gym-focus="application"
        className="min-h-dvh select-none antialiased"
      >
        <div className="application-frame mx-auto w-full max-w-xl">
          <AppProviders locale={locale}>{children}</AppProviders>
          {process.env.GYM_QA_WEB === "true" &&
            process.env.GYM_PH0_REFERENCE === "true" && <Ph0Trace />}
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
