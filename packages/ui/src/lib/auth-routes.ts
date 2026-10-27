import { safeReturnPath } from "../account/safe-return-path";

const publicRoutes = new Set([
  "/",
  "/discovery",
  "/explore",
  "/services",
  "/services/detail",
  "/coaches",
  "/coaches/detail",
  "/calendars",
  "/calendars/detail",
  "/games",
  "/games/detail",
  "/privacy",
  "/login",
  "/auth/otp",
  "/auth/login",
  "/reset-password",
]);

/** Browsing is public; account destinations require a confirmed session. */
export function applicationRouteRequiresAccount(pathname: string, search = "") {
  const path = pathname.replace(/\/$/, "") || "/";
  if (
    path === "/calendars" &&
    new URLSearchParams(search).get("view") === "following"
  )
    return true;
  return !publicRoutes.has(path) && !path.startsWith("/discovery/");
}

/** Cancel goes to public content; successful sign-in still uses the full intent. */
export function applicationAuthCancelHref(returnTo: string) {
  const destination = safeReturnPath(returnTo, "/discovery");
  const url = new URL(destination, "https://gym.invalid");
  if (url.pathname === "/checkout" || url.pathname === "/checkout/") {
    const service = url.searchParams.get("service");
    return service
      ? `/services/detail?${new URLSearchParams({ id: service })}`
      : "/services";
  }
  return applicationRouteRequiresAccount(url.pathname, url.search) ||
    /^\/(?:auth(?:\/|$)|login(?:[/?#]|$)|reset-password(?:[/?#]|$))/.test(
      destination,
    )
    ? "/discovery"
    : destination;
}

export type ApplicationAuthMethod = "otp" | "password";
export function applicationAuthHref(
  method: ApplicationAuthMethod,
  returnTo = "/",
) {
  const path = method === "password" ? "/auth/login" : "/auth/otp";
  return `${path}?${new URLSearchParams({ returnTo: safeReturnPath(returnTo, "/") })}`;
}

/** Keep old bookmarked/native login links working without a second form. */
export function legacyAuthDestination(search: string) {
  const params = new URLSearchParams(search);
  return applicationAuthHref(
    params.get("method") === "password" ? "password" : "otp",
    params.get("returnTo") ?? "/",
  );
}

export function applicationAuthBackPath(search: string) {
  return applicationAuthCancelHref(
    new URLSearchParams(search).get("returnTo") ?? "/discovery",
  );
}
