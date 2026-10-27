/** The main athlete experience is gym discovery, memberships and reservations.
 * Secondary routes remain reachable for existing purchases and coach work. */
export const primaryServiceKinds = [
  "membership",
  "access",
  "class",
  "course",
  "court",
] as const;

export function isPrimaryService(kind: string) {
  return primaryServiceKinds.some((item) => item === kind);
}

export function primaryNavigationSection(pathname: string) {
  const path = pathname.replace(/\/$/, "") || "/";
  if (path === "/") return "home";
  if (
    path === "/discovery" ||
    path.startsWith("/discovery/") ||
    path === "/services" ||
    path.startsWith("/services/")
  )
    return "gyms";
  if (path === "/bookings" || path.startsWith("/bookings/")) return "bookings";
  if (
    path === "/memberships" ||
    path.startsWith("/memberships/") ||
    path.startsWith("/membership-card")
  )
    return "memberships";
  return null;
}
