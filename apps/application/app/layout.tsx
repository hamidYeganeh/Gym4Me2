import localFont from "next/font/local";

import type { Metadata } from "next";
import type { ReactNode } from "react";

import { I18nProvider } from "@repo/i18n";
import messages from "@repo/i18n/messages/fa";

import "./globals.css";

const iranSansX = localFont({
  src: "../../../packages/theme/src/fonts/iransansx-variable.woff2",
  weight: "100 1000",
  display: "swap",
  adjustFontFallback: false,
  variable: "--next-font-primary",
});

export const metadata: Metadata = { title: "جیم‌فورمی", description: "همراه شما در مسیر تمرین" };

const RootLayout = (props: { children: ReactNode }) => {
  const { children } = props;

  return (
    <html lang="fa" dir="rtl" className={`dark ${iranSansX.variable}`}>
      <body
        style={{ fontVariationSettings: '"DOTS" 4' }}
        className="bg-theme-background font-theme-primary text-theme-foreground"
      >
        <I18nProvider locale="fa" messages={messages} timeZone="Asia/Tehran">
          {children}
        </I18nProvider>
      </body>
    </html>
  );
};

export default RootLayout;
