import { safeReturnPath } from "./safe-return-path";

/** Both sign-in methods must complete the same onboarding and return hops. */
export function loginDestination({
  client,
  returnTo,
  recovery,
  displayName,
}: {
  client: "application" | "business" | "admin";
  returnTo: string;
  recovery: boolean;
  displayName: string | null;
}) {
  const destination = safeReturnPath(returnTo, "/");
  if (recovery)
    return `/set-password?${new URLSearchParams({ returnTo: destination })}`;
  if (
    client === "application" &&
    !displayName &&
    destination.split("?")[0] !== "/profile/complete"
  )
    return `/profile/complete?${new URLSearchParams({ returnTo: destination })}`;
  return destination;
}
