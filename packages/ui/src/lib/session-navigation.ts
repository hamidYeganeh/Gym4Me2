import { safeReturnPath } from "../account/safe-return-path";
import { applicationAuthHref } from "./auth-routes";

type Client = "application" | "business" | "admin";
export function sessionSignInHref(
  client: Client,
  returnTo: string,
  method: "otp" | "password" = "otp",
) {
  const destination = safeReturnPath(returnTo, "/");
  return client === "application"
    ? applicationAuthHref(method, destination)
    : `/login?${new URLSearchParams({ returnTo: destination, ...(method === "password" ? { method } : {}) })}`;
}

export function passwordRecoveryHref(returnTo: string) {
  return `/reset-password?${new URLSearchParams({ returnTo: safeReturnPath(returnTo, "/") })}`;
}

/** Reading policy must return to the same sign-in method and complete destination. */
export function policyBackHref(client: Client, search: string) {
  const params = new URLSearchParams(search);
  if (params.get("from") !== "login")
    return client === "application" ? "/profile/settings" : "/";
  if (params.get("recovery") === "true")
    return passwordRecoveryHref(params.get("returnTo") ?? "/profile");
  return sessionSignInHref(
    client,
    params.get("returnTo") ?? "/profile",
    params.get("method") === "password" ? "password" : "otp",
  );
}
