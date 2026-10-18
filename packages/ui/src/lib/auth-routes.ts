import { safeReturnPath } from "../account/safe-return-path";

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
  const destination = safeReturnPath(
    new URLSearchParams(search).get("returnTo"),
    "/profile",
  );
  return /^\/(?:auth(?:\/|$)|login(?:[/?#]|$))/.test(destination)
    ? "/profile"
    : destination;
}
