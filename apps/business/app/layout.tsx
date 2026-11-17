import localFont from "next/font/local";

import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ApiProvider } from "@repo/api/react-query";

import "./globals.css";

const iranSansX = localFont({
  src: "../../../packages/theme/src/fonts/iransansx-variable.woff2",
  weight: "100 1000",
  display: "swap",
  adjustFontFallback: false,
  variable: "--next-font-primary",
});

export const metadata: Metadata = {
  title: "Gym4Me Business",
  description: "Manage your gym on Gym4Me.",
};

const RootLayout = (props: { children: ReactNode }) => {
  const { children } = props;

  return (
    <html lang="en" className={`dark ${iranSansX.variable}`}>
      <body
        style={{ fontVariationSettings: '"DOTS" 4' }}
        className="bg-theme-background font-theme-primary text-theme-foreground"
      >
        <ApiProvider>{children}</ApiProvider>
      </body>
    </html>
  );
};

export default RootLayout;
