"use client";
import { useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLocale } from "@repo/i18n";
import { ApiProvider } from "@repo/api/provider";
import {
  TrainingHome,
  TrainingWorkout,
  TrainingBuilder,
} from "@repo/ui/training";
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
  const content =
    screen === "club" ? (
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
          aria-label="Local visual QA"
        >
          <label>
            Screen{" "}
            <select
              aria-label="QA screen"
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
            </select>
          </label>
          <label>
            State{" "}
            <select
              aria-label="QA state"
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
            </select>
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
      {!["cards", "club", "gallery"].includes(screen) && (
        <LumaNavigation
          pathOverride={
            screen === "discovery" ||
            screen === "services" ||
            screen === "service"
              ? "/discovery"
              : screen === "messages"
                ? "/messages"
                : "/"
          }
        />
      )}
    </>
  );
}
