/** Fallback for Android launches without an in-app history entry. */
export function accountBackPath(pathname: string, search = ""): string | null {
  const path = pathname.replace(/\/$/, "") || "/";
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
  if (path === "/reset-password") return "/login";
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
    return returnTo
      ? `/login?returnTo=${encodeURIComponent(returnTo)}`
      : "/login";
  }
  return null;
}
