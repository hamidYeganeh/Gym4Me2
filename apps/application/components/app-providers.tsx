"use client";
import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, getDirection, type Locale } from "@repo/i18n";
import { ClientLocaleProvider } from "@repo/i18n/client-provider";
import { ApiProvider } from "@repo/api/provider";
import { ThemeProvider, useTheme } from "@repo/theme/provider";
import { DirectionProvider } from "@repo/ui/kit/Direction";
import { TooltipProvider } from "@repo/ui/kit/Tooltip";
import { Toaster } from "@repo/ui/kit/Sonner";
import { PageTransitions } from "@repo/ui/page-transitions";
import { createNativeFetch } from "../lib/native-fetch";
import { nativeVault } from "../lib/native-vault";
import { FavoritesSync } from "./discovery/use-saved-club";
import { accountBackPath } from "../lib/account-back";
import { nativeClubLink } from "../lib/native-deep-link";
import { startNativeOtp } from "../lib/native-otp";
import { AccountExportProvider, OtpAutofillProvider } from "@repo/ui/account";
const nativeApiFetch =
  process.env.NEXT_PUBLIC_NATIVE_EXPORT === "true"
    ? createNativeFetch(
        process.env.NEXT_PUBLIC_API_URL,
        nativeVault(process.env.NEXT_PUBLIC_API_URL),
      )
    : undefined;

function NativeRuntime() {
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    let disposed = false;
    const removers: (() => Promise<void>)[] = [];
    void (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform() || disposed) return;
      const { App } = await import("@capacitor/app");
      const clean = async () => {
        const { clearExpiredNativeExports } =
          await import("../lib/native-export");
        await clearExpiredNativeExports();
      };
      const navigate = (url: string) => {
        const path = nativeClubLink(url, process.env.NEXT_PUBLIC_SITE_URL);
        if (path && !disposed) router.push(path);
      };
      for (const handle of [
        await App.addListener("appUrlOpen", ({ url }) => navigate(url)),
        await App.addListener("resume", () => {
          void clean().catch(() => undefined);
        }),
      ]) {
        if (disposed) await handle.remove();
        else removers.push(() => handle.remove());
      }
      const launch = await App.getLaunchUrl();
      if (launch) navigate(launch.url);
      await clean();
    })().catch(() => undefined);
    return () => {
      disposed = true;
      for (const remove of removers) void remove();
    };
  }, [router]);
  useEffect(() => {
    let disposed = false;
    let remove: (() => Promise<void>) | undefined;
    void (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform() || disposed) return;
      const { App } = await import("@capacitor/app");
      const listener = await App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack && pathname !== "/") router.back();
        else {
          const parent = accountBackPath(pathname, window.location.search);
          if (parent) router.replace(parent);
          else void App.minimizeApp();
        }
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
    <ApiProvider
      application="application"
      locale={locale}
      fetch={nativeApiFetch}
      baseUrl={
        process.env.NEXT_PUBLIC_NATIVE_EXPORT === "true"
          ? process.env.NEXT_PUBLIC_API_URL
          : undefined
      }
    >
      <OtpAutofillProvider start={startNativeOtp}>
        <AccountExportProvider
          exportFile={
            process.env.NEXT_PUBLIC_NATIVE_EXPORT === "true"
              ? async (data) => {
                  const { exportNativeAccount } =
                    await import("../lib/native-export");
                  await exportNativeAccount(data);
                }
              : undefined
          }
        >
          <DirectionProvider dir={direction}>
            <TooltipProvider>
              <NativeRuntime />
              <FavoritesSync />
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
        </AccountExportProvider>
      </OtpAutofillProvider>
    </ApiProvider>
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
