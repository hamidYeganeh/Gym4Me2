"use client";
import "./qa-canvas.css";
import { useMemo, type ReactNode, type ComponentProps } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "@repo/i18n";
import { ApiProvider } from "@repo/api/provider";
import {
  AccountWorkspace,
  CoachingDirectory,
  CoachingOffice,
  CoachingSessionNote,
  CoachingWorkspace,
  CompleteProfilePage,
  LoginPage,
  MobileAccount,
  PublicPrivacyPage,
  SetPasswordPage,
  StudentAssessment,
  WorkspaceShell,
} from "@repo/ui/account";
import {
  TrainingBuilder,
  TrainingCollaboration,
  TrainingHome,
  TrainingWorkout,
} from "@repo/ui/training";
import { TrainingPage } from "@repo/ui/training-page";
import { AdvancedBusinessPanel } from "@repo/ui/advanced-business";
import { SportsWorkspace, SportsAdmin, SportsFrame } from "@repo/ui/sports";
import { AnalyticsPanel } from "@repo/ui/analytics";
import { SportsHostConversations } from "@repo/ui/sports-messages";
import { SportsHostConversation } from "@repo/ui/sports-host-conversation";
import { ClubPage } from "../discovery/club-page";
import { ClubRoute } from "../discovery/club-route";
import { ClubGallery } from "../discovery/club-gallery";
import { ClubReviews } from "../discovery/club-reviews";
import { ClubComparison } from "../discovery/club-comparison";
import { CoachPage } from "../discovery/coach-page";
import { Discovery } from "../discovery/discovery";
import { DiscoveryMap } from "../discovery/discovery-map";
import { SavedClubsPage, SavedCoachesPage } from "../discovery/saved-pages";
import { CalendarDetail, CalendarsPage } from "../luma/calendars";
import { HomePage } from "../luma/home";
import {
  BookingDetail,
  BookingsPage,
  MembershipDetail,
  MembershipsPage,
  OrderDetail,
  OrdersPage,
  WaitlistPage,
} from "../luma/bookings";
import { ConversationDetails, ConversationPage } from "../luma/chat";
import { CheckoutPage, PaymentStatus } from "../luma/checkout";
import { DocumentsPage } from "../luma/documents";
import { HostPage } from "../luma/community";
import { SportsInvitations } from "../luma/invitations";
import { MessagesPage } from "../luma/messages";
import { MockGateway } from "../luma/mock-gateway";
import { NotificationsPage } from "../luma/notifications";
import { NotificationPreferences } from "../luma/notification-preferences";
import { ServiceDetail, ServicesPage } from "../luma/services";
import { SupportDetail, SupportPage } from "../luma/support";
import { MembershipCardPage, TicketPage } from "../luma/ticket";
import { LumaNavigation } from "../luma/common";
import { applicationRouteLayout } from "../../lib/navigation-route";
import { protectedCatalogFixtures } from "../../test/fixtures/protected-catalog";
import {
  publicServiceFixtures,
  webFixtureId,
} from "../../test/fixtures/public-services";
import { createMobileFixtureFetch } from "../../test/fixtures/mobile-visual";
import { getCoaches } from "../../lib/coaches";
import { clubIds } from "../../lib/clubs";
type Section = ComponentProps<typeof AccountWorkspace>["section"];

type Surface = "application" | "business" | "admin";
const accountSections: Record<string, Section> = {
  "/": "overview",
  "/organizations": "organizations",
  "/branches": "branches",
  "/team": "team",
  "/profile": "profile",
  "/sessions": "sessions",
  "/invitations": "invitations",
  "/analytics": "analytics",
  "/audit": "audit",
  "/catalog-reviews": "catalog-reviews",
  "/demo": "demo",
  "/locations": "locations",
  "/moderation": "moderation",
  "/taxonomies": "taxonomies",
  "/users": "users",
};

/** Every entry renders the same component and props as its real page export. */
export function RouteReference() {
  const params = useSearchParams(),
    locale = useLocale(),
    t = useTranslations();
  const surface: Surface =
    params.get("surface") === "admin"
      ? "admin"
      : params.get("surface") === "business"
        ? "business"
        : "application";
  const route = params.get("route") ?? "/";
  const state = params.get("state") ?? "filled";
  const catalog = useMemo(() => protectedCatalogFixtures(), []);
  const services = useMemo(
    () => publicServiceFixtures().map((s) => ({ ...s, cover: null })),
    [],
  );
  const fetch = useMemo(
    () => createMobileFixtureFetch(catalog, services, state, surface),
    [catalog, services, state, surface],
  );
  const clubId = params.get("club") ?? catalog.clubs[0]!.id;
  const entityId = params.get("entity") ?? clubId;
  const branchId = params.get("branch") ?? catalog.branches[0]!.id;
  let content: ReactNode;
  const auth =
    route.startsWith("/auth/") || ["/login", "/reset-password"].includes(route);
  if (auth)
    content = (
      <LoginPage
        client={surface}
        recovery={route === "/reset-password"}
        initialMethod={
          route === "/auth/login" || params.get("method") === "password"
            ? "password"
            : "otp"
        }
      />
    );
  else if (route === "/set-password")
    content = (
      <SetPasswordPage
        backHref={surface === "application" ? undefined : "/profile"}
      />
    );
  else if (route === "/privacy")
    content = <PublicPrivacyPage mobile={surface === "application"} />;
  else if (surface !== "application") {
    const section = accountSections[route];
    if (section)
      content = <AccountWorkspace client={surface} section={section} />;
    else if (route.startsWith("/organizations/"))
      content = (
        <AccountWorkspace
          client={surface}
          section="organizations"
          entityId={entityId}
          branchId={route.includes("/branches/") ? branchId : undefined}
        />
      );
    else if (route.startsWith("/users/"))
      content = (
        <AccountWorkspace
          client={surface}
          section="users"
          entityId={params.get("user") ?? webFixtureId(9999)}
        />
      );
    else if (route === "/advanced")
      content = <AdvancedBusinessPanel surface={surface} />;
    else if (route === "/coaching")
      content = <CoachingOffice surface={surface} />;
    else if (route === "/training")
      content = <TrainingPage client={surface} back={t("Privacy.back")} />;
    else if (route === "/operations") content = <SportsAdmin />;
    else if (route === "/reports")
      content = (
        <SportsFrame title={t("Analytics.title")}>
          <AnalyticsPanel surface="business" />
        </SportsFrame>
      );
    else if (route === "/messages") content = <SportsHostConversations />;
    else if (route.startsWith("/messages/"))
      content = (
        <SportsHostConversation id={params.get("id") ?? webFixtureId(601)} />
      );
    else if (
      [
        "calendar",
        "imports",
        "members",
        "payments",
        "resources",
        "services",
        "reception",
      ].includes(route.slice(1))
    )
      content = (
        <SportsWorkspace
          page={
            route.slice(1) as
              | "calendar"
              | "imports"
              | "members"
              | "payments"
              | "resources"
              | "services"
              | "reception"
          }
        />
      );
    else
      content = (
        <p role="alert" data-qa-unmapped>
          {t("MobileReference.unmappedRoute", { route: `${surface}${route}` })}
        </p>
      );
    if (!auth && !["/privacy", "/set-password"].includes(route))
      content = (
        <WorkspaceShell client={surface} currentPath={route}>
          {content}
        </WorkspaceShell>
      );
  } else {
    const views: Record<string, ReactNode> = {
      "/calendars": <CalendarsPage />,
      "/calendars/detail": <CalendarDetail />,
      "/": <HomePage />,
      "/discovery": <Discovery />,
      "/discovery/club": <ClubRoute />,
      "/discovery/clubs/[clubId]": <ClubPage clubId={clubId} />,
      "/discovery/clubs/[clubId]/gallery": <ClubGallery clubId={clubId} />,
      "/discovery/clubs/[clubId]/reviews": <ClubReviews clubId={clubId} full />,
      "/discovery/clubs/[clubId]/slots": (
        <ServicesPage
          organizationId={clubId}
          branchId={branchId}
          back={`/discovery/clubs/${clubId}`}
        />
      ),
      "/discovery/coaches/[coachId]": (
        <CoachPage coachId={getCoaches(locale, clubIds[0]!)[0]!.id} />
      ),
      "/discovery/compare": <ClubComparison />,
      "/discovery/map": <DiscoveryMap />,
      "/saved": <SavedClubsPage />,
      "/saved/clubs": <SavedClubsPage />,
      "/saved/coaches": <SavedCoachesPage />,
      "/coaches": <CoachingDirectory />,
      "/coaches/detail": <CoachingDirectory detail />,
      "/coaching": <CoachingWorkspace />,
      "/coaching/session": <CoachingSessionNote />,
      "/coaching/student": <StudentAssessment />,
      "/coaching/settlements": <AdvancedBusinessPanel surface="coach" />,
      "/services": <ServicesPage />,
      "/services/detail": <ServiceDetail />,
      "/bookings": <BookingsPage />,
      "/bookings/detail": <BookingDetail />,
      "/memberships": <MembershipsPage />,
      "/memberships/detail": <MembershipDetail />,
      "/membership-card": <MembershipCardPage />,
      "/tickets/view": <TicketPage />,
      "/orders": <OrdersPage />,
      "/orders/detail": <OrderDetail />,
      "/checkout": <CheckoutPage />,
      "/checkout/status": <PaymentStatus />,
      "/checkout/mock-gateway": <MockGateway />,
      "/waitlist": <WaitlistPage />,
      "/messages": <MessagesPage />,
      "/messages/conversation": <ConversationPage />,
      "/messages/details": <ConversationDetails />,
      "/notifications": <NotificationsPage />,
      "/notifications/preferences": <NotificationPreferences />,
      "/documents": <DocumentsPage />,
      "/host": <HostPage />,
      "/invitations/sports": <SportsInvitations />,
      "/support": <SupportPage />,
      "/support/detail": <SupportDetail />,
      "/training": <TrainingHome />,
      "/training/plan": <TrainingBuilder />,
      "/training/workout": <TrainingWorkout />,
      "/training/conversation": <TrainingCollaboration />,
      "/profile/complete": <CompleteProfilePage />,
      "/profile": <MobileAccount section="account" />,
      "/profile/edit": <MobileAccount section="edit" />,
      "/profile/settings": <MobileAccount section="settings" />,
      "/profile/settings/privacy": <MobileAccount section="privacy" />,
      "/sessions": <MobileAccount section="sessions" />,
      "/invitations": <MobileAccount section="invitations" />,
    };
    content = views[route] ?? (
      <p role="alert" data-qa-unmapped>
        {t("MobileReference.unmappedRoute", { route: `${surface}${route}` })}
      </p>
    );
  }
  const chrome = applicationRouteLayout(route, params.toString());
  return (
    <div
      data-qa-route={route}
      data-qa-surface={surface}
      {...(surface !== "application" ? { "data-qa-workspace": "" } : {})}
    >
      <ApiProvider
        key={`${surface}:${route}:${state}:${locale}`}
        application={surface}
        locale={locale}
        baseUrl="/visual-fixture"
        fetch={fetch}
      >
        {content}
      </ApiProvider>
      {surface === "application" && chrome.navigationVisible && (
        <LumaNavigation pathOverride={route} />
      )}
    </div>
  );
}
