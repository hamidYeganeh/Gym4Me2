"use client";
import { DetailPrefetch } from "./detail-prefetch";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useLocale, getDirection, type Locale } from "@repo/i18n";
import { ClientLocaleProvider } from "@repo/i18n/client-provider";
import { ApiProvider, setNativeApiForeground } from "@repo/api/provider";
import { ThemeProvider, useTheme } from "@repo/theme/provider";
import { applicationThemeStorageKey } from "../lib/application-theme";
import { DirectionProvider } from "@repo/ui/kit/Direction";
import { TooltipProvider } from "@repo/ui/kit/Tooltip";
import { Toaster } from "@repo/ui/kit/Sileo";
import { TrainingPdfProvider } from "@repo/ui/training";
import { LumaShell } from "./luma/shell";
import { NativePushRuntime } from "./luma/native-device-notifications";
import { createNativeFetch } from "../lib/native-fetch";
import { nativeVault } from "../lib/native-vault";
import { FavoritesSync } from "./discovery/use-saved-club";
import { accountBackPath } from "../lib/account-back";
import { registerAppNavigation, performAppBack } from "../lib/app-navigation";
import { nativeAppLink } from "../lib/native-deep-link";
import { startNativeOtp } from "../lib/native-otp";
import { AccountExportProvider, OtpAutofillProvider } from "@repo/ui/account";
const nativeApiFetch =
  process.env.NEXT_PUBLIC_NATIVE_EXPORT === "true"
    ? createNativeFetch(
        process.env.NEXT_PUBLIC_API_URL,
        nativeVault(process.env.NEXT_PUBLIC_API_URL),
      )
    : undefined;

function AppNavigationRuntime() {
  useEffect(() => registerAppNavigation(), []);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker
      .getRegistrations()
      .then(async (registrations) => {
        for (const registration of registrations) {
          const worker =
            registration.active ??
            registration.waiting ??
            registration.installing;
          if (
            worker &&
            new URL(worker.scriptURL).pathname === "/training-sw.js"
          )
            await registration.update();
        }
      })
      .catch(() => undefined);
  }, []);
  return null;
}
function NativeRuntime() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute(
        "content",
        resolvedTheme === "light" ? "#ffffff" : "#101113",
      );
  }, [resolvedTheme]);
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
        const path = nativeAppLink(url, process.env.NEXT_PUBLIC_SITE_URL);
        if (path && !disposed) router.push(path);
      };
      for (const handle of [
        await App.addListener("appStateChange", ({ isActive }) =>
          setNativeApiForeground(isActive),
        ),
        await App.addListener("appUrlOpen", ({ url }) => navigate(url)),
        await App.addListener("resume", () => {
          void clean().catch(() => undefined);
        }),
      ]) {
        if (disposed) await handle.remove();
        else removers.push(() => handle.remove());
      }
      const state = await App.getState();
      if (!disposed) setNativeApiForeground(state.isActive);
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
        const { pathname, search } = window.location;
        if (
          !performAppBack(
            router,
            accountBackPath(pathname, search),
            canGoBack && pathname !== "/",
          )
        )
          void App.minimizeApp();
      });
      if (disposed) await listener.remove();
      else remove = () => listener.remove();
    })().catch(console.error);
    return () => {
      disposed = true;
      void remove?.();
    };
  }, [router]);
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
      <DetailPrefetch />
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
          <TrainingPdfProvider
            sharePdf={
              process.env.NEXT_PUBLIC_NATIVE_EXPORT === "true"
                ? async (bytes) => {
                    const { exportNativePdf } =
                      await import("../lib/native-export");
                    await exportNativePdf(bytes);
                  }
                : undefined
            }
          >
            <DirectionProvider dir={direction}>
              <TooltipProvider>
                <NativeRuntime />
                <NativePushRuntime />
                <FavoritesSync />
                <LumaShell>{children}</LumaShell>
                <Toaster
                  dir={direction}
                  offset={{
                    top: "calc(1rem + var(--app-safe-top))",
                    bottom: "calc(1rem + var(--app-safe-bottom))",
                    left: "calc(1rem + var(--app-safe-left))",
                    right: "calc(1rem + var(--app-safe-right))",
                  }}
                />
              </TooltipProvider>
            </DirectionProvider>
          </TrainingPdfProvider>
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
      <ThemeProvider defaultTheme="dark" storageKey={applicationThemeStorageKey}>
        <AppNavigationRuntime />
        <DirectionAndMotion>{children}</DirectionAndMotion>
      </ThemeProvider>
    </ClientLocaleProvider>
  );
}
