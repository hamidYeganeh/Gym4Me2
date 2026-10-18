import {
  applicationAuthBackPath,
  applicationAuthHref,
} from "@repo/ui/lib/auth-routes";

/** Fallback for Android launches without an in-app history entry. */
export function accountBackPath(pathname: string, search = ""): string | null {
  const path = pathname.replace(/\/$/, "") || "/";
  const parents: Record<string, string> = {
    "/services/detail": "/services",
    "/checkout": "/services",
    "/checkout/status": "/orders",
    "/bookings/detail": "/bookings",
    "/memberships/detail": "/memberships",
    "/orders/detail": "/orders",
    "/calendars/detail": "/calendars",
    "/messages/conversation": "/messages",
    "/support/detail": "/support",
    "/notifications/preferences": "/notifications",
    "/invitations/sports": "/",
    "/membership-card": "/",
    "/documents": "/",
    "/host": "/",
  };
  if (path === "/checkout" || path === "/documents") {
    const id = new URLSearchParams(search).get("service");
    if (id) return `/services/detail?id=${encodeURIComponent(id)}`;
  }
  if (parents[path]) return parents[path];
  if (path === "/tickets/view") {
    const p = new URLSearchParams(search);
    const id = p.get("id");
    return id
      ? `${p.get("membership") === "true" ? "/memberships/detail" : "/bookings/detail"}?id=${encodeURIComponent(id)}`
      : "/";
  }
  if (path === "/messages/details") {
    const id = new URLSearchParams(search).get("id");
    return id
      ? `/messages/conversation?id=${encodeURIComponent(id)}`
      : "/messages";
  }
  if (
    [
      "/services",
      "/bookings",
      "/memberships",
      "/orders",
      "/calendars",
      "/messages",
      "/support",
      "/notifications",
      "/waitlist",
    ].includes(path)
  )
    return "/";
  if (path === "/discovery/club") {
    const params = new URLSearchParams(search);
    if (params.has("view") && params.has("id")) {
      const back = new URLSearchParams({ id: params.get("id")! });
      if (params.has("branch")) back.set("branch", params.get("branch")!);
      return `/discovery/club?${back}`;
    }
    return "/discovery";
  }
  const club =
    /^(\/discovery\/clubs\/[^/]+)(?:\/(gallery|reviews|slots))?$/.exec(path);
  if (club) {
    const branch = new URLSearchParams(search).get("branch");
    return club[2]
      ? `${club[1]}${branch ? `?${new URLSearchParams({ branch })}` : ""}`
      : "/discovery";
  }
  if (path === "/discovery/map" || path === "/discovery/compare")
    return "/discovery";
  if (path === "/set-password") return "/profile/settings";
  if (path === "/reset-password")
    return applicationAuthHref(
      "password",
      new URLSearchParams(search).get("returnTo") ?? "/profile",
    );
  if (path === "/auth/otp" || path === "/auth/login")
    return applicationAuthBackPath(search);
  if (path === "/profile") return "/discovery";
  if (
    path === "/profile/edit" ||
    path === "/profile/settings" ||
    path === "/invitations" ||
    path === "/login"
  )
    return "/profile";
  if (path === "/sessions" || path === "/profile/settings/privacy")
    return "/profile/settings";
  if (path === "/privacy") {
    const params = new URLSearchParams(search);
    if (params.get("from") !== "login") return "/profile/settings";
    const returnTo = params.get("returnTo");
    return applicationAuthHref(
      params.get("method") === "password" ? "password" : "otp",
      returnTo ?? "/profile",
    );
  }
  return null;
}
