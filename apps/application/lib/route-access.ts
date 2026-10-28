import { applicationRouteRequiresAccount as requiresAccount } from "@repo/ui/lib/auth-routes";

export function applicationRouteRequiresAccount(pathname: string, search = "") {
  // The demo's server page owns its dev-only gate, including production 404s.
  if (pathname.replace(/\/$/, "") === "/demo") return false;
  return requiresAccount(pathname, search);
}
