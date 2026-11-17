import localFont from "next/font/local";

import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

import { AdminProviders } from "../lib/AdminProviders";

const iranSansX = localFont({
  src: "../../../packages/theme/src/fonts/iransansx-variable.woff2",
  weight: "100 1000",
  display: "swap",
  adjustFontFallback: false,
  variable: "--next-font-primary",
});

export const metadata: Metadata = {
  title: { default: "Gym4Me Admin", template: "%s · Gym4Me Admin" },
  description: "Manage the Gym4Me platform.",
};

const RootLayout = (props: { children: ReactNode }) => {
  const { children } = props;

  return (
    <html lang="en" className={`dark ${iranSansX.variable}`}>
      <body
        style={{ fontVariationSettings: '"DOTS" 4' }}
        className="bg-theme-background font-theme-primary text-theme-foreground"
      >
        <AdminProviders>{children}</AdminProviders>
      </body>
    </html>
  );
};

export default RootLayout;
