"use client";
import { DemoPanel } from "../training/service-reviews";
import { useTranslations, useLocale, getDirection } from "@repo/i18n";

import { useAccount, useAccess } from "@repo/api/profile";
import { useLogout } from "@repo/api/auth";
import { useOrganizations } from "@repo/api/business";
import { useAdminOverview } from "@repo/api/admin";
import { ApiError, type ApiApplication as Client } from "@repo/api";
import type { Account } from "@repo/api/auth";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState, Suspense, type ReactNode } from "react";
import {
  Building2,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Users,
  UserRound,
  Monitor,
  ScrollText,
  Mail,
  MapPin,
  Tags,
  MessageSquare,
  CalendarDays,
} from "lucide-react";
import { Button } from "@repo/ui/kit/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/kit/Card";
import { NativeSelect, NativeSelectOption } from "@repo/ui/kit/NativeSelect";
import { Field, FieldLabel } from "@repo/ui/kit/Field";

import { Blank, Loading, QueryError, Status, useRoleNames } from "./common";
import { ProfileContent, SessionsContent, InvitationsContent } from "./profile";
import { PrivacyNotice } from "./privacy";
import { BranchesContent, OrganizationsContent, TeamContent } from "./business";
import {
  AdminAuditContent,
  AdminOrganizationsContent,
  AdminUsersContent,
  useEventNames,
} from "./admin";
import {
  AdminTaxonomiesContent,
  AdminLocationsContent,
  AdminModerationContent,
} from "./admin-catalog";
import {
  AdminOrganizationDetailContent,
  AdminBranchDetailContent,
  AdminUserDetailContent,
} from "./admin-details";
import { BusinessClubContent, BusinessBranchContent } from "./business-catalog";
import { useDateLabel } from "./common";
import { sessionSignInHref } from "../lib/session-navigation";
import { accountReadDenied } from "../lib/account-recovery";
import { isActiveSurfaceElement } from "../lib/active-surface";
export type Section =
  | "overview"
  | "organizations"
  | "branches"
  | "team"
  | "profile"
  | "sessions"
  | "invitations"
  | "users"
  | "audit"
  | "catalog-reviews"
  | "taxonomies"
  | "locations"
  | "moderation"
  | "demo";
const commonNav = [
  {
    key: "profile",
    href: "/profile",
    title: "Copy.myProfile",
    icon: UserRound,
  },
  {
    key: "sessions",
    href: "/sessions",
    title: "Copy.activeSessions",
    icon: Monitor,
  },
  {
    key: "invitations",
    href: "/invitations",
    title: "Copy.teamInvitations",
    icon: Mail,
  },
] as const;
const businessNav = [
  {
    key: "coaching",
    href: "/coaching",
    title: "Practice.coachingManagement",
    icon: Users,
  },
  { key: "overview", href: "/", title: "Copy.overview", icon: LayoutDashboard },
  {
    key: "organizations",
    href: "/organizations",
    title: "Copy.myOrganizations",
    icon: Building2,
  },
  { key: "branches", href: "/branches", title: "Copy.branches", icon: MapPin },
  { key: "team", href: "/team", title: "Copy.teamMembers", icon: Users },
  {
    key: "sports-services",
    href: "/services",
    title: "Luma.services",
    icon: CalendarDays,
  },
  {
    key: "reception",
    href: "/reception",
    title: "Luma.reception",
    icon: Users,
  },
  {
    key: "sports-calendar",
    href: "/calendar",
    title: "Luma.calendar",
    icon: CalendarDays,
  },
  {
    key: "sports-messages",
    href: "/messages",
    title: "Luma.messages",
    icon: MessageSquare,
  },
] as const;
const adminNav = [
  {
    key: "demo",
    href: "/demo",
    title: "Training.demoControls",
    icon: ShieldCheck,
  },
  {
    key: "coaching",
    href: "/coaching",
    title: "Practice.coachReview",
    icon: Users,
  },
  { key: "overview", href: "/", title: "Copy.overview", icon: LayoutDashboard },
  { key: "users", href: "/users", title: "Copy.users", icon: Users },
  {
    key: "sports-operations",
    href: "/operations",
    title: "Luma.operations",
    icon: CalendarDays,
  },
  {
    key: "organizations",
    href: "/organizations",
    title: "Copy.reviewOrganizations",
    icon: Building2,
  },
  {
    key: "catalog-reviews",
    href: "/catalog-reviews",
    title: "Copy.publicationQueue",
    icon: ShieldCheck,
  },
  {
    key: "taxonomies",
    href: "/taxonomies",
    title: "Copy.categories",
    icon: Tags,
  },
  {
    key: "locations",
    href: "/locations",
    title: "Copy.geography",
    icon: MapPin,
  },
  {
    key: "moderation",
    href: "/moderation",
    title: "Copy.reviewModeration",
    icon: MessageSquare,
  },
  {
    key: "audit",
    href: "/audit",
    title: "Copy.auditLog",
    icon: ScrollText,
  },
] as const;
export function AccountWorkspace({
  client,
  section,
  entityId,
  branchId,
}: {
  client: Client;
  section: Section;
  entityId?: string;
  branchId?: string;
}) {
  const t = useTranslations();

  const router = useRouter();
  const accountQuery = useAccount();
  // Denied access hides the previous identity; temporary outages preserve drafts.
  const account = accountReadDenied(accountQuery.error)
    ? undefined
    : accountQuery.data;
  const workspace = useRef<HTMLDivElement>(null);
  const path = usePathname();
  const loginHref = sessionSignInHref(
    client,
    typeof window === "undefined"
      ? path
      : window.location.pathname + window.location.search,
  );
  const accessQuery = useAccess(client === "admin" && Boolean(account));
  const logoutMutation = useLogout();
  const allowed =
    client !== "admin" ||
    Boolean(!accessQuery.error && accessQuery.data?.isAdmin);
  const ready =
    !accountQuery.isLoading &&
    !(client === "admin" && account && accessQuery.isLoading);
  const error = accountQuery.error ?? accessQuery.error ?? logoutMutation.error;
  const busy = logoutMutation.isPending;
  useEffect(() => {
    if (
      error instanceof ApiError &&
      error.status === 401 &&
      isActiveSurfaceElement(workspace.current)
    )
      router.replace(loginHref);
  }, [error, router, loginHref]);
  async function logout() {
    try {
      await logoutMutation.mutateAsync();
      router.replace(loginHref);
    } catch {
      /* The mutation exposes its error through the shared notice. */
    }
  }
  const locale = useLocale();
  const nav = [
    ...(client === "business"
      ? businessNav
      : client === "admin"
        ? adminNav
        : []),
    ...commonNav,
  ].map((item) => ({ ...item, title: t(item.title) }));
  const title =
    (client === "admin" || client === "business") && entityId
      ? section === "users"
        ? t("Copy.userRecord")
        : branchId
          ? t("Copy.branchRecord")
          : t("Copy.organizationRecord")
      : (nav.find((item) => item.key === section)?.title ??
        t("Copy.myAccount"));
  return (
    <div
      ref={workspace}
      dir={getDirection(locale)}
      className="min-h-dvh bg-muted/25 lg:flex"
    >
      {client !== "application" && (
        <aside className="flex flex-col border-b bg-background p-5 lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-e">
          <Link
            href="/"
            className="mb-8 flex items-center gap-2 text-xl font-semibold"
          >
            <Dumbbell className="size-7 text-primary" />
            <span dir="ltr">
              {t("Copy.brand")}{" "}
              <span className="text-xs text-muted-foreground">
                {client === "business"
                  ? t("Copy.businessBrand")
                  : t("Copy.adminBrand")}
              </span>
            </span>
          </Link>
          <p className="mb-3 px-3 text-xs text-muted-foreground">
            {client === "business"
              ? t("Copy.clubWorkspace")
              : t("Copy.platformManagement")}
          </p>
          <nav
            aria-label={t("Copy.panelNavigation")}
            className="flex gap-1 overflow-x-auto lg:flex-col"
          >
            {nav.map((item) => (
              <Button
                key={item.key}
                variant={section === item.key ? "secondary" : "ghost"}
                className="shrink-0 justify-start"
                asChild
              >
                <Link
                  href={item.href}
                  aria-current={section === item.key ? "page" : undefined}
                >
                  <item.icon data-icon="inline-start" />
                  {item.title}
                </Link>
              </Button>
            ))}
          </nav>
          <div className="mt-auto hidden pt-8 text-xs leading-6 text-muted-foreground lg:block">
            <ShieldCheck className="mb-2 size-5" />
            {t("Copy.accessDependsOnEachPersonSRole")}{" "}
          </div>
        </aside>
      )}
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between gap-4 border-b bg-background px-5 py-4 lg:px-10">
          <div>
            <p className="text-sm text-muted-foreground">
              {client === "application"
                ? t("Copy.sharedAthleteAndCoachAccount")
                : t("Copy.panelBreadcrumb", { title })}
            </p>
            <h1 className="mt-1 text-xl font-semibold">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm sm:inline">
              {account?.displayName ?? account?.phone}
            </span>
            {account && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void logout()}
                disabled={busy}
              >
                <LogOut data-icon="inline-start" />
                {t("Copy.signOut")}{" "}
              </Button>
            )}
          </div>
        </header>
        {client === "application" && (
          <nav
            aria-label={t("Copy.myAccount")}
            className="flex gap-2 overflow-auto border-b bg-background p-3"
          >
            {nav.map((item) => (
              <Button
                key={item.key}
                variant={section === item.key ? "secondary" : "ghost"}
                asChild
              >
                <Link href={item.href}>{item.title}</Link>
              </Button>
            ))}
            <Button variant="ghost" asChild>
              <Link href="/discovery">{t("Copy.discoverClubs")}</Link>
            </Button>
          </nav>
        )}
        <main className="mx-auto grid max-w-6xl gap-7 p-5 lg:p-10">
          {account && !accessQuery.error && section !== "profile" && (
            <PrivacyNotice />
          )}
          <QueryError
            error={error}
            retry={() => {
              void accountQuery.refetch();
              if (client === "admin" && account) void accessQuery.refetch();
            }}
          />
          {!ready ? (
            <Loading />
          ) : account && !accessQuery.error ? (
            !allowed ? (
              <Blank
                title={t("Copy.administratorAccessIsNotEnabledForThis")}
                description={t("Copy.signInWithAnAdministratorAccountOr")}
              />
            ) : (
              <WorkspaceContent
                client={client}
                section={section}
                account={account}
                entityId={entityId}
                branchId={branchId}
              />
            )
          ) : null}
        </main>
      </div>
    </div>
  );
}
function WorkspaceContent({
  client,
  section,
  account,
  entityId,
  branchId,
}: {
  client: Client;
  section: Section;
  account: Account;
  entityId?: string;
  branchId?: string;
}) {
  if (section === "profile")
    return <ProfileContent key={account.id} account={account} />;
  if (section === "sessions") return <SessionsContent />;
  if (section === "invitations") return <InvitationsContent />;
  if (client === "admin") {
    if (section === "users" && entityId)
      return <AdminUserDetailContent key={entityId} id={entityId} />;
    if (section === "organizations" && entityId)
      return branchId ? (
        <AdminBranchDetailContent
          key={branchId}
          organizationId={entityId}
          branchId={branchId}
        />
      ) : (
        <AdminOrganizationDetailContent key={entityId} id={entityId} />
      );
    if (section === "catalog-reviews")
      return <AdminOrganizationsContent publicationQueue />;
    if (section === "taxonomies") return <AdminTaxonomiesContent />;
    if (section === "locations") return <AdminLocationsContent />;
    if (section === "demo") return <DemoPanel />;
    if (section === "moderation") return <AdminModerationContent />;
    if (section === "users") return <AdminUsersContent />;
    if (section === "organizations") return <AdminOrganizationsContent />;
    if (section === "audit") return <AdminAuditContent />;
    return <AdminOverview />;
  }
  if (section === "organizations" && entityId)
    return branchId ? (
      <BusinessBranchContent id={entityId} branchId={branchId} />
    ) : (
      <BusinessClubContent id={entityId} />
    );
  if (section === "organizations") return <OrganizationsContent />;
  if (section === "branches" || section === "team")
    return (
      <Suspense fallback={<Loading />}>
        <OrganizationScope section={section} />
      </Suspense>
    );
  return <BusinessOverview name={account.displayName} />;
}
function OrganizationScope({ section }: { section: "branches" | "team" }) {
  const roleNames = useRoleNames();

  const t = useTranslations();

  const query = useOrganizations();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState(
    searchParams.get("organization") ?? "",
  );
  const org = query.data?.find((o) => o.id === selected) ?? query.data?.[0];
  if (query.isLoading) return <Loading />;
  if (query.error)
    return <QueryError error={query.error} retry={query.refetch} />;
  if (!org)
    return (
      <Blank
        title={t("Copy.noOrganizationsYet2")}
        description={t("Copy.registerYourFirstOrganizationOrAcceptA")}
      />
    );
  return (
    <>
      <Field className="max-w-sm">
        <FieldLabel htmlFor="organization">
          {t("Copy.activeOrganization")}
        </FieldLabel>
        <NativeSelect
          id="organization"
          value={org.id}
          onChange={(e) => setSelected(e.target.value)}
        >
          {query.data?.map((item) => (
            <NativeSelectOption key={item.id} value={item.id}>
              {item.name} · {roleNames[item.role]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      {section === "branches" ? (
        <BranchesContent key={org.id} organization={org} />
      ) : (
        <TeamContent key={org.id} organization={org} />
      )}
    </>
  );
}
export function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: ReactNode;
}) {
  const locale = useLocale();

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-sm font-normal text-muted-foreground">
          {label}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-semibold tabular-nums">
          {value.toLocaleString(locale)}
        </p>
      </CardContent>
    </Card>
  );
}
function BusinessOverview({ name }: { name: string | null }) {
  const roleNames = useRoleNames();

  const t = useTranslations();

  const query = useOrganizations();
  return (
    <>
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">
            {name
              ? t("Copy.welcomeName", { name: name })
              : t("Copy.welcomeToYourWorkspace")}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {t("Copy.manageYourOrganizationsAndTeamAccessHere")}{" "}
          </p>
        </div>
        <Button asChild>
          <Link href="/organizations">{t("Copy.organizationCreated")}</Link>
        </Button>
      </section>
      <QueryError error={query.error} retry={query.refetch} />
      {query.isLoading ? (
        <Loading />
      ) : (
        query.data && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Metric
                label={t("Copy.myOrganizations")}
                value={query.data.length}
                icon={<Building2 className="size-5 text-muted-foreground" />}
              />
              <Metric
                label={t("Copy.approvedOrganizations")}
                value={query.data.filter((o) => o.status === "approved").length}
                icon={<ShieldCheck className="size-5 text-muted-foreground" />}
              />
              <Metric
                label={t("Copy.pendingReview")}
                value={query.data.filter((o) => o.status === "pending").length}
                icon={<ScrollText className="size-5 text-muted-foreground" />}
              />
            </div>
            {!query.data.length ? (
              <Blank
                title={t("Copy.registerYourFirstOrganization")}
                description={t("Copy.enterANameAddBranchesAndInvite")}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>{t("Copy.yourOrganizations")}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  {query.data.map((o) => (
                    <div
                      key={o.id}
                      className="flex items-center justify-between gap-3 border-b pb-4 last:border-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium">{o.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {roleNames[o.role]}
                        </p>
                      </div>
                      <Status value={o.status} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )
      )}
    </>
  );
}
function AdminOverview() {
  const dateLabel = useDateLabel();
  const eventNames = useEventNames();

  const t = useTranslations();

  const query = useAdminOverview();
  return (
    <>
      <h2 className="text-2xl font-semibold">{t("Copy.platformStatus")}</h2>
      <QueryError error={query.error} retry={query.refetch} />
      {query.isLoading ? (
        <Loading />
      ) : (
        query.data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Metric
                label={t("Copy.users")}
                value={query.data.users}
                icon={<Users className="size-5 text-muted-foreground" />}
              />
              <Metric
                label={t("Copy.organizations")}
                value={query.data.organizations}
                icon={<Building2 className="size-5 text-muted-foreground" />}
              />
              <Metric
                label={t("Copy.awaitingReview")}
                value={query.data.pending}
                icon={<ScrollText className="size-5 text-muted-foreground" />}
              />
              <Metric
                label={t("Copy.publishedClubs")}
                value={query.data.published}
                icon={<Dumbbell className="size-5 text-muted-foreground" />}
              />
              <Metric
                label={t("Copy.inPublicationQueue")}
                value={query.data.pendingPublication}
                icon={<ShieldCheck className="size-5 text-muted-foreground" />}
              />
              <Metric
                label={t("Copy.pendingReviews")}
                value={query.data.pendingReviews}
                icon={
                  <MessageSquare className="size-5 text-muted-foreground" />
                }
              />
            </div>
            <Card>
              <CardHeader>
                <CardTitle>{t("Copy.recentEvents")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                {query.data.recent.length ? (
                  query.data.recent.map((event) => (
                    <div
                      key={event.id}
                      className="flex flex-wrap justify-between gap-3 border-b pb-3 text-sm last:border-0"
                    >
                      <div>
                        <p>{eventNames[event.action] ?? event.action}</p>
                        {event.reason && (
                          <p className="mt-1 text-muted-foreground">
                            {event.reason}
                          </p>
                        )}
                      </div>
                      <span className="text-muted-foreground">
                        {dateLabel(event.createdAt)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("Copy.noEventsRecorded")}{" "}
                  </p>
                )}
                <Button
                  variant="outline"
                  className="justify-self-start"
                  asChild
                >
                  <Link href="/audit">{t("Copy.allEvents")}</Link>
                </Button>
              </CardContent>
            </Card>
          </>
        )
      )}
      <Card>
        <CardHeader>
          <CardTitle>{t("Copy.organizationReviewQueue")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {t("Copy.reviewRegisteredOrganizationsAndSaveADecision")}{" "}
          </p>
          <Button asChild>
            <Link href="/catalog-reviews">
              {t("Copy.reviewPublicationQueue")}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
