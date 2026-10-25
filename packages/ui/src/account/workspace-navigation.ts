import {
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  CreditCard,
  Dumbbell,
  FileInput,
  LayoutDashboard,
  Mail,
  MapPin,
  MessageSquare,
  Monitor,
  Package,
  ScrollText,
  ShieldCheck,
  Tags,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { TranslationKey } from "@repo/i18n/messages";
export type NavigationGroup = "work" | "management" | "finance" | "account";
export type WorkspaceNavItem = {
  key: string;
  href: string;
  title: TranslationKey;
  icon: LucideIcon;
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
    key: "networks",
    href: "/networks",
    title: "Growth.networks",
    icon: Users,
    group: "finance",
  },
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
    key: "training",
    href: "/training",
    title: "Luma.training",
    icon: Dumbbell,
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
    key: "training",
    href: "/training",
    title: "Luma.training",
    icon: Dumbbell,
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
export function workspaceNavigation(
  client: "business" | "admin" | "application",
) {
  return [
    ...(client === "business"
      ? businessNav
      : client === "admin"
        ? adminNav
        : []),
    ...commonNav,
  ];
}
export function isWorkspaceRouteActive(path: string, href: string) {
  return href === "/"
    ? path === "/"
    : path === href || path.startsWith(href + "/");
}
