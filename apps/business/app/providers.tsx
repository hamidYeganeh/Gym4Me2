"use client";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useLocale, getDirection } from "@repo/i18n";
import { ApiProvider } from "@repo/api/provider";
import { ThemeProvider } from "@repo/theme/provider";
import { DirectionProvider } from "@repo/ui/kit/Direction";
import { TooltipProvider } from "@repo/ui/kit/Tooltip";
import { Toaster } from "@repo/ui/kit/Sonner";
import { PageTransitions } from "@repo/ui/page-transitions";

export function BusinessProviders({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const pathname = usePathname();
  const direction = getDirection(locale === "en" ? "en" : "fa");
  return (
    <ApiProvider application="business" locale={locale}>
      <ThemeProvider>
        <DirectionProvider dir={direction}>
          <TooltipProvider>
            <PageTransitions surface="business" routeId={pathname}>
              {children}
            </PageTransitions>
            <Toaster dir={direction} />
          </TooltipProvider>
        </DirectionProvider>
      </ThemeProvider>
    </ApiProvider>
  );
}
