import type { Metadata } from "next";
import { defaultLocale, getDirection } from "@repo/i18n";
import { getTranslator } from "@repo/i18n/messages";
import { iranSansX } from "@repo/theme/fonts";
import { WebsiteProviders } from "@/components/WebsiteProviders";
import "./globals.css";

const t = getTranslator(defaultLocale);
export const metadata: Metadata = {
  title: t("Metadata.brand"),
  description: t("Metadata.description"),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang={defaultLocale}
      dir={getDirection(defaultLocale)}
      className={iranSansX.variable}
      suppressHydrationWarning
    >
      <body>
        <WebsiteProviders>{children}</WebsiteProviders>
      </body>
    </html>
  );
}
