"use client";
import { AdvancedBusinessPanel } from "@repo/ui/advanced-business";
import { SelectOptionsReference } from "./select-options-reference";
import { NativeSelect } from "@repo/ui/kit/NativeSelect";
import { useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "@repo/i18n";
import { ApiProvider } from "@repo/api/provider";
import {
  TrainingHome,
  TrainingWorkout,
  TrainingBuilder,
} from "@repo/ui/training";
import { AnalyticsPanel } from "@repo/ui/analytics";
import { DiscoveryMap } from "../discovery/discovery-map";
import { NotificationPreferences } from "../luma/notification-preferences";
import { MobileAccount, CoachingWorkspace } from "@repo/ui/account";
import { ClubPage } from "../discovery/club-page";
import { ClubGallery } from "../discovery/club-gallery";
import { Discovery } from "../discovery/discovery";
import { HomePage } from "../luma/home";
import {
  BookingsPage,
  BookingDetail,
  MembershipsPage,
  OrdersPage,
} from "../luma/bookings";
import { ServicesPage, ServiceDetail } from "../luma/services";
import { MessagesPage } from "../luma/messages";
import { CheckoutPage, PaymentStatus } from "../luma/checkout";
import { NotificationsPage } from "../luma/notifications";
import { Ph0Reference } from "./ph0-reference";
import { LumaNavigation } from "../luma/common";
import { protectedCatalogFixtures } from "../../test/fixtures/protected-catalog";
import {
  publicServiceFixtures,
  webFixtureId,
} from "../../test/fixtures/public-services";
import { createMobileFixtureFetch } from "../../test/fixtures/mobile-visual";

const screens = [
  "ph5-business",
  "ph5-coach",
  "ph5-admin",
  "select-options",
  "checkout",
  "payment",
  "analytics",
  "business-analytics",
  "coach-analytics",
  "map",
  "notification-preferences",
  "profile-edit",
  "discovery",
  "cards",
  "club",
  "gallery",
  "home",
  "services",
  "service",
  "bookings",
  "booking",
  "memberships",
  "orders",
  "messages",
  "notifications",
  "profile",
  "settings",
  "privacy",
  "coaching",
  "training",
  "workout",
  "builder",
] as const;
export function MobileReference() {
  const qa = useTranslations("MobileReference");
  const router = useRouter();
  const params = useSearchParams(),
    locale = useLocale();
  const screen = params.get("screen") ?? "discovery";
  const state = params.get("state") ?? "filled";
  const catalog = useMemo(() => protectedCatalogFixtures(), []);
  const services = useMemo(
    () => publicServiceFixtures().map((s) => ({ ...s, cover: null })),
    [],
  );
  const fetch = useMemo(
    () => createMobileFixtureFetch(catalog, services, state),
    [catalog, services, state],
  );
  const content = screen.startsWith("ph5-") ? (
    <AdvancedBusinessPanel
      surface={
        screen === "ph5-business"
          ? "business"
          : screen === "ph5-admin"
            ? "admin"
            : "coach"
      }
    />
  ) : screen === "select-options" ? (
    <SelectOptionsReference />
  ) : screen === "checkout" ? (
    <CheckoutPage />
  ) : screen === "payment" ? (
    <PaymentStatus />
  ) : ["analytics", "business-analytics", "coach-analytics"].includes(
      screen,
    ) ? (
    <main className="gym-workspace min-h-dvh p-5 pb-32">
      <AnalyticsPanel
        surface={
          screen === "analytics"
            ? "admin"
            : screen === "business-analytics"
              ? "business"
              : "coach"
        }
      />
    </main>
  ) : screen === "map" ? (
    <DiscoveryMap />
  ) : screen === "notification-preferences" ? (
    <NotificationPreferences />
  ) : screen === "profile-edit" ? (
    <MobileAccount section="edit" />
  ) : screen === "club" ? (
    <ClubPage clubId={catalog.clubs[0]!.id} />
  ) : screen === "gallery" ? (
    <ClubGallery clubId={catalog.clubs[0]!.id} />
  ) : screen === "cards" ? (
    <Ph0Reference summary={catalog.summaries[0]!} />
  ) : screen === "home" ? (
    <HomePage />
  ) : screen === "services" ? (
    <ServicesPage />
  ) : screen === "service" ? (
    <ServiceDetail />
  ) : screen === "bookings" ? (
    <BookingsPage />
  ) : screen === "booking" ? (
    <BookingDetail />
  ) : screen === "memberships" ? (
    <MembershipsPage />
  ) : screen === "orders" ? (
    <OrdersPage />
  ) : screen === "messages" ? (
    <MessagesPage />
  ) : screen === "notifications" ? (
    <NotificationsPage />
  ) : screen === "profile" ? (
    <MobileAccount section="account" />
  ) : screen === "settings" ? (
    <MobileAccount section="settings" />
  ) : screen === "privacy" ? (
    <MobileAccount section="privacy" />
  ) : screen === "coaching" ? (
    <CoachingWorkspace />
  ) : screen === "training" ? (
    <TrainingHome />
  ) : screen === "workout" ? (
    <TrainingWorkout />
  ) : screen === "builder" ? (
    <TrainingBuilder />
  ) : (
    <Discovery />
  );
  return (
    <>
      {params.get("presentation") !== "1" && (
        <aside
          className="flex flex-wrap gap-2 border-b p-3 text-xs"
          aria-label={qa("label")}
        >
          <label>
            {qa("screen")}{" "}
            <NativeSelect
              aria-label={qa("screen")}
              value={screen}
              onChange={(e) => {
                router.push(
                  `/qa/mobile?screen=${e.target.value}&state=${state}&id=${webFixtureId(e.target.value === "workout" ? 700 : 1)}`,
                );
              }}
            >
              {screens.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </NativeSelect>
          </label>
          <label>
            {qa("state")}{" "}
            <NativeSelect
              aria-label={qa("state")}
              value={state}
              onChange={(e) => {
                router.push(
                  `/qa/mobile?screen=${screen}&state=${e.target.value}&id=${webFixtureId(screen === "workout" ? 700 : 1)}`,
                );
              }}
            >
              {["filled", "empty", "error", "guest"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </NativeSelect>
          </label>
        </aside>
      )}
      <ApiProvider
        key={`${screen}:${state}:${locale}`}
        application="application"
        locale={locale}
        baseUrl="/visual-fixture"
        fetch={fetch}
      >
        {content}
      </ApiProvider>
      {![
        "cards",
        "club",
        "gallery",
        "map",
        "analytics",
        "business-analytics",
        "coach-analytics",
        "checkout",
      ].includes(screen) && (
        <LumaNavigation
          pathOverride={
            screen === "discovery" ||
            screen === "services" ||
            screen === "service"
              ? "/discovery"
              : ["training", "builder", "workout"].includes(screen)
                ? "/training"
                : [
                      "profile",
                      "profile-edit",
                      "settings",
                      "privacy",
                      "coaching",
                    ].includes(screen)
                  ? "/profile"
                  : screen === "messages"
                    ? "/messages"
                    : screen === "home"
                      ? "/"
                      : `/${screen}`
          }
        />
      )}
    </>
  );
}
