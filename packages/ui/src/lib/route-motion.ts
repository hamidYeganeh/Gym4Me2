export type AppSurface = "application" | "business" | "admin";

/** Route families, not filters, own full-page motion. Durations are in seconds. */
export const routeMotion = {
  fade: 0.12,
  push: 0.22,
  sheet: 0.2,
} as const;

export const sheetRoutes = [
  "/login",
  "/auth/otp",
  "/auth/login",
  "/reset-password",
  "/set-password",
  "/profile/complete",
  "/profile/edit",
  "/documents",
  "/notifications/preferences",
  "/checkout",
  "/checkout/**",
  "/tickets/**",
];

export const surfaceTabs: Record<AppSurface, string[]> = {
  application: ["/", "/discovery", "/messages"],
  business: [
    "/",
    "/organizations",
    "/branches",
    "/team",
    "/services",
    "/resources",
    "/calendar",
    "/members",
    "/messages",
    "/reception",
    "/payments",
    "/reports",
    "/imports",
  ],
  admin: [
    "/",
    "/users",
    "/organizations",
    "/catalog-reviews",
    "/locations",
    "/taxonomies",
    "/moderation",
    "/audit",
    "/operations",
  ],
};

export const detailRoutes = [
  "/training",
  "/training/**",
  "/coaching/**",
  "/coaches/*",
  "/services/*",
  "/bookings/*",
  "/memberships/*",
  "/orders/*",
  "/calendars/*",
  "/messages/**",
  "/support/*",
  "/profile/**",
  "/sessions",
  "/privacy",
  "/invitations",
  "/invitations/sports",
  "/membership-card",
  "/organizations/**",
  "/users/*",
  "/discovery/coaches/*",
  "/discovery/clubs/*/slots",
  "/discovery/clubs/*/reviews",
  "/discovery/clubs/*/gallery",
];
