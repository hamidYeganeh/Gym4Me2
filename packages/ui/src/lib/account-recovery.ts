import { isCredentialRejection } from "@repo/api";
import { safeReturnPath } from "../account/safe-return-path";

export function accountEntryHref(
  entry: "/login" | "/auth/otp" | "/auth/login" | "/profile/complete",
  returnTo: string,
) {
  return `${entry}?returnTo=${encodeURIComponent(safeReturnPath(returnTo, "/profile"))}`;
}

/** Recoverable account errors must not be presented as a retryable outage. */
export function accountRecovery(
  error: unknown,
  returnTo: string,
  consentPath: "/profile" | "/profile/complete" = "/profile",
) {
  if (!error || typeof error !== "object") return null;
  if (
    "status" in error &&
    error.status === 401 &&
    !isCredentialRejection(error)
  )
    return {
      kind: "signIn",
      href: accountEntryHref("/login", returnTo),
    } as const;
  if ("code" in error && error.code === "Backend.privacyConsentRequired")
    return {
      kind: "consent",
      href:
        consentPath === "/profile/complete"
          ? accountEntryHref(consentPath, returnTo)
          : consentPath,
    } as const;
  return null;
}

/** Keep drafts during an outage; authorization failure retires the cached identity. */
export function accountReadDenied(error: unknown) {
  return Boolean(
    error &&
    typeof error === "object" &&
    (("status" in error &&
      (error.status === 401 || error.status === 403 || error.status === 428)) ||
      ("code" in error && error.code === "Backend.privacyConsentRequired")),
  );
}
