import type { TranslationKey } from "@repo/i18n/messages";
import {
  Building2Icon as Building2,
  Calendar1Icon as CalendarDays,
  ChartAxisLinesIcon as ChartNoAxesCombined,
  CreditCardIcon as CreditCard,
  BarbellHorizontalIcon as Dumbbell,
  FileUploadIcon as FileInput,
  GridFourIcon as LayoutDashboard,
  Envelope1Icon as Mail,
  MapPin1Icon as MapPin,
  ChatLineIcon as MessageSquare,
  MonitorIcon as Monitor,
  BoxCubeIcon as Package,
  Note1Icon as ScrollText,
  ShieldCheckIcon as ShieldCheck,
  PriceTagIcon as Tags,
  UserIcon as UserRound,
  UsersTwoIcon as Users,
} from "../icons";
export type NavigationGroup = "work" | "management" | "finance" | "account";
export type WorkspaceNavItem = {
  key: string;
  href: string;
  title: TranslationKey;
  icon: typeof Building2;
  group: NavigationGroup;
};
export const commonNav: WorkspaceNavItem[] = [
  {
    key: "profile",
    href: "/profile",
    title: "Copy.myProfile",
    icon: UserRound,
    group: "account",
  },
  {
    key: "sessions",
    href: "/sessions",
    title: "Copy.activeSessions",
    icon: Monitor,
    group: "account",
  },
  {
    key: "invitations",
    href: "/invitations",
    title: "Copy.teamInvitations",
    icon: Mail,
    group: "account",
  },
];
export const businessNav: WorkspaceNavItem[] = [
  {
    key: "crm",
    href: "/crm",
    title: "Growth.title",
    icon: Users,
    group: "management",
  },
  {
    key: "overview",
    href: "/",
    title: "Copy.overview",
    icon: LayoutDashboard,
    group: "work",
  },
  {
    key: "sports-calendar",
    href: "/calendar",
    title: "Luma.calendar",
    icon: CalendarDays,
    group: "work",
  },
  {
    key: "sports-services",
    href: "/services",
    title: "Luma.services",
    icon: Dumbbell,
    group: "work",
  },
  {
    key: "members",
    href: "/members",
    title: "Luma.members",
    icon: Users,
    group: "work",
  },
  {
    key: "reception",
    href: "/reception",
    title: "Luma.reception",
    icon: Users,
    group: "work",
  },
  {
    key: "sports-messages",
    href: "/messages",
    title: "Luma.messages",
    icon: MessageSquare,
    group: "work",
  },
  {
    key: "organizations",
    href: "/organizations",
    title: "Copy.myOrganizations",
    icon: Building2,
    group: "management",
  },
  {
    key: "branches",
    href: "/branches",
    title: "Copy.branches",
    icon: MapPin,
    group: "management",
  },
  {
    key: "team",
    href: "/team",
    title: "Copy.teamMembers",
    icon: Users,
    group: "management",
  },
  {
    key: "coaching",
    href: "/coaching",
    title: "Practice.coachingManagement",
    icon: Users,
    group: "management",
  },
  {
    key: "resources",
    href: "/resources",
    title: "WorkspaceNav.resources",
    icon: Package,
    group: "management",
  },
  {
    key: "imports",
    href: "/imports",
    title: "WorkspaceNav.imports",
    icon: FileInput,
    group: "management",
  },
  {
    key: "payments",
    href: "/payments",
    title: "WorkspaceNav.payments",
    icon: CreditCard,
    group: "finance",
  },
  {
    key: "reports",
    href: "/reports",
    title: "WorkspaceNav.reports",
    icon: ChartNoAxesCombined,
    group: "finance",
  },
  {
    key: "advanced",
    href: "/advanced",
    title: "WorkspaceNav.advanced",
    icon: ScrollText,
    group: "finance",
  },
];
export const adminNav: WorkspaceNavItem[] = [
  {
    key: "overview",
    href: "/",
    title: "Copy.overview",
    icon: LayoutDashboard,
    group: "work",
  },
  {
    key: "analytics",
    href: "/analytics",
    title: "Analytics.title",
    icon: ChartNoAxesCombined,
    group: "work",
  },
  {
    key: "sports-operations",
    href: "/operations",
    title: "Luma.operations",
    icon: CalendarDays,
    group: "work",
  },
  {
    key: "users",
    href: "/users",
    title: "Copy.users",
    icon: Users,
    group: "management",
  },
  {
    key: "organizations",
    href: "/organizations",
    title: "Copy.reviewOrganizations",
    icon: Building2,
    group: "management",
  },
  { key: "discovery-content", href: "/discovery-content", title: "DiscoveryAdmin.title", icon: Building2, group: "management" },
  {
    key: "catalog-reviews",
    href: "/catalog-reviews",
    title: "Copy.publicationQueue",
    icon: ShieldCheck,
    group: "management",
  },
  {
    key: "moderation",
    href: "/moderation",
    title: "Copy.reviewModeration",
    icon: MessageSquare,
    group: "management",
  },
  {
    key: "coaching",
    href: "/coaching",
    title: "Practice.coachReview",
    icon: Users,
    group: "management",
  },
  {
    key: "taxonomies",
    href: "/taxonomies",
    title: "Copy.categories",
    icon: Tags,
    group: "management",
  },
  {
    key: "locations",
    href: "/locations",
    title: "Copy.geography",
    icon: MapPin,
    group: "management",
  },
  {
    key: "advanced",
    href: "/advanced",
    title: "WorkspaceNav.advanced",
    icon: ScrollText,
    group: "finance",
  },
  {
    key: "audit",
    href: "/audit",
    title: "Copy.auditLog",
    icon: ScrollText,
    group: "account",
  },
  {
    key: "demo",
    href: "/demo",
    title: "Training.demoControls",
    icon: ShieldCheck,
    group: "account",
  },
];
export type WorkspaceNavigationContext = Partial<
  import("@repo/api/profile").ProductNavigation
>;
const secondaryKeys = new Set([
  "crm",
  "advanced",
  "branches",
  "team",
  "coaching",
  "resources",
  "imports",
]);
function permitted(item: WorkspaceNavItem, c: WorkspaceNavigationContext) {
  if (item.key === "invitations") return Boolean(c.teamInvites);
  if (item.key === "sports-messages") return Boolean(c.messages);
  if (
    ["sports-calendar", "sports-services", "members", "reception"].includes(
      item.key,
    )
  )
    return Boolean(c.operate);
  if (["payments", "reports"].includes(item.key)) return Boolean(c.finance);
  if (item.key === "branches") return Boolean(c.manage && c.multipleBranches);
  if (item.key === "crm") return Boolean(c.manage && c.businessReady);
  if (item.key === "advanced") return Boolean(c.finance && c.businessReady);
  if (secondaryKeys.has(item.key)) return Boolean(c.manage);
  return true;
}
export function workspaceNavigation(
  client: "business" | "admin" | "application",
  context: WorkspaceNavigationContext = {},
) {
  if (client === "business")
    return [
      ...businessNav.filter((item) => !secondaryKeys.has(item.key)),
      ...commonNav,
    ].filter((item) => permitted(item, context));
  return [
    ...(client === "admin" ? adminNav : []),
    ...commonNav.filter(
      (item) => item.key !== "invitations" || context.teamInvites,
    ),
  ];
}
export function workspaceSecondaryNavigation(
  context: WorkspaceNavigationContext = {},
) {
  return businessNav.filter(
    (item) => secondaryKeys.has(item.key) && permitted(item, context),
  );
}
export function isWorkspaceRouteActive(path: string, href: string) {
  return href === "/"
    ? path === "/"
    : path === href || path.startsWith(href + "/");
}
