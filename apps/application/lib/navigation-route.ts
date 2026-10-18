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
    "/calendars/detail": "/calendars",
    "/messages/conversation": "/messages",
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
    ].includes(logical) ||
    logical === "/qa/ph0" ||
    logical.startsWith("/tickets/") ||
    logical.startsWith("/checkout/mock-gateway") ||
    logical.endsWith("/gallery");
  return {
    logical,
    protectedPage,
    navigationVisible: !protectedPage && !fullscreen,
  };
}
