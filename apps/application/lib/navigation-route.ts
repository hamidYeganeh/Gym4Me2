/** Query based native shells represent the same logical screens as web routes. */
export function navigationRoute(pathname: string, search: string) {
  const params = new URLSearchParams(search);
  const id = params.get("id");
  const clean = pathname.replace(/\/$/, "") || "/";
  if (clean === "/discovery/club" && id) {
    const view = params.get("view");
    return `/discovery/clubs/${encodeURIComponent(id)}${["gallery", "reviews", "slots"].includes(view ?? "") ? `/${view}` : ""}`;
  }
  const shells: Record<string, string> = {
    "/services/detail": "/services",
    "/bookings/detail": "/bookings",
    "/memberships/detail": "/memberships",
    "/orders/detail": "/orders",

    "/messages/conversation": "/messages",
    "/training/conversation": "/training/conversation",
    "/training/workout": "/training/workout",
    "/training/plan": "/training/plan",
    "/support/detail": "/support",
    "/tickets/view": "/tickets",
  };
  if (clean === "/messages/details" && id)
    return `/messages/${encodeURIComponent(id)}/details`;
  if (shells[clean] && id) return `${shells[clean]}/${encodeURIComponent(id)}`;
  if (clean === "/checkout/status" && params.get("order"))
    return `/checkout/status/${encodeURIComponent(params.get("order")!)}`;
  if (clean === "/checkout/mock-gateway" && params.get("order"))
    return `/checkout/mock-gateway/${encodeURIComponent(params.get("order")!)}`;
  return clean;
}

/** Web paths and exported query shells must have identical chrome. */
export function applicationRouteLayout(pathname: string, search: string) {
  const logical = navigationRoute(pathname, search);
  const protectedPage =
    logical === "/discovery/map" ||
    logical === "/discovery/club" ||
    /^\/discovery\/clubs\/[^/]+$/.test(logical);
  const fullscreen =
    [
      "/login",
      "/auth/otp",
      "/auth/login",
      "/reset-password",
      "/set-password",
      "/profile/complete",
      "/checkout",
    ].includes(logical) ||
    logical.startsWith("/services/") ||
    logical.startsWith("/tickets/") ||
    logical.startsWith("/checkout/mock-gateway") ||
    logical.startsWith("/messages/") ||
    logical.startsWith("/training/") ||
    logical.startsWith("/coaching/") ||
    logical.startsWith("/profile/") ||
    logical.startsWith("/support/") ||
    logical.startsWith("/bookings/") ||
    logical.startsWith("/orders/") ||
    logical.startsWith("/memberships/") ||
    logical.endsWith("/gallery");
  return {
    logical,
    protectedPage,
    navigationVisible: !protectedPage && !fullscreen,
  };
}
