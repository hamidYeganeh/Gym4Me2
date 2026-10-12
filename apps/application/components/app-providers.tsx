"use client";
import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, getDirection, type Locale } from "@repo/i18n";
import { ClientLocaleProvider } from "@repo/i18n/client-provider";
import { ThemeProvider, useTheme } from "@repo/theme/provider";
import { DirectionProvider } from "@repo/ui/kit/Direction";
import { TooltipProvider } from "@repo/ui/kit/Tooltip";
import { Toaster } from "@repo/ui/kit/Sonner";
import { PageTransitions } from "@repo/ui/page-transitions";

function NativeRuntime() {
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    let disposed = false;
    let remove: (() => Promise<void>) | undefined;
    void (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform() || disposed) return;
      const { App } = await import("@capacitor/app");
      const listener = await App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack && pathname !== "/") router.back();
        else void App.minimizeApp();
      });
      if (disposed) await listener.remove();
      else remove = () => listener.remove();
    })().catch(console.error);
    return () => {
      disposed = true;
      void remove?.();
    };
  }, [pathname, router]);
  useEffect(() => {
    let disposed = false;
    void (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (
        !Capacitor.isNativePlatform() ||
        !Capacitor.isPluginAvailable("StatusBar") ||
        disposed
      )
        return;
      const { StatusBar, Style } = await import("@capacitor/status-bar");
      if (!disposed)
        await StatusBar.setStyle({
          style: resolvedTheme === "dark" ? Style.Dark : Style.Light,
        });
    })().catch(console.error);
    return () => {
      disposed = true;
    };
  }, [resolvedTheme]);
  return null;
}
function DirectionAndMotion({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const direction = getDirection(locale);
  return (
    <DirectionProvider dir={direction}>
      <TooltipProvider>
        <NativeRuntime />
        <PageTransitions>{children}</PageTransitions>
        <Toaster
          dir={direction}
          offset={{
            top: "calc(1rem + var(--app-safe-top))",
            bottom: "calc(1rem + var(--app-safe-bottom))",
            left: "calc(1rem + var(--app-safe-left))",
            right: "calc(1rem + var(--app-safe-right))",
          }}
          mobileOffset={{
            top: "calc(1rem + var(--app-safe-top))",
            bottom: "calc(1rem + var(--app-safe-bottom))",
            left: "calc(1rem + var(--app-safe-left))",
            right: "calc(1rem + var(--app-safe-right))",
          }}
        />
      </TooltipProvider>
    </DirectionProvider>
  );
}
export function AppProviders({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <ClientLocaleProvider initialLocale={locale}>
      <ThemeProvider>
        <DirectionAndMotion>{children}</DirectionAndMotion>
      </ThemeProvider>
    </ClientLocaleProvider>
  );
}
