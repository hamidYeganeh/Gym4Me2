import { nativeSportsRoutes } from "./native-link-routes.mjs";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Accept only public club links. Never forward arbitrary paths or credentials. */
export function nativeClubLink(
  value: string,
  siteOrigin?: string,
): string | null {
  try {
    const url = new URL(value);
    const custom = url.protocol === "gym4me:" && url.hostname === "club";
    const trusted = siteOrigin ? new URL(siteOrigin) : undefined;
    if (
      !custom &&
      !(
        url.protocol === "https:" &&
        trusted?.protocol === "https:" &&
        url.origin === trusted.origin
      )
    )
      return null;
    if (url.username || url.password || (url.port && custom)) return null;
    const match = custom
      ? /^\/([^/]+)\/?$/.exec(url.pathname)
      : /^\/discovery\/clubs\/([^/]+)(?:\/(gallery|reviews|slots))?\/?$/.exec(
          url.pathname,
        );
    if (!match || !uuid.test(match[1])) return null;
    const params = new URLSearchParams({ id: match[1] });
    if (match[2]) params.set("view", match[2]);
    const branch = url.searchParams.get("branch");
    if (branch && uuid.test(branch)) params.set("branch", branch);
    return `/discovery/club?${params}`;
  } catch {
    return null;
  }
}

/** Only approved public sports routes are accepted; query credentials are discarded. */
export function nativeAppLink(
  value: string,
  siteOrigin?: string,
): string | null {
  const club = nativeClubLink(value, siteOrigin);
  if (club) return club;
  try {
    const url = new URL(value);
    const custom = url.protocol === "gym4me:";
    const trusted = siteOrigin ? new URL(siteOrigin) : undefined;
    if (
      url.username ||
      url.password ||
      (custom && url.port) ||
      (!custom &&
        !(
          url.protocol === "https:" &&
          trusted?.protocol === "https:" &&
          url.origin === trusted.origin
        ))
    )
      return null;
    const parts = custom
      ? [url.hostname, url.pathname.slice(1)]
      : /^\/([^/]+)\/([^/]+)\/?$/.exec(url.pathname)?.slice(1);
    if (!parts) return null;
    const target = nativeSportsRoutes.find(
      (route) =>
        route.webSegment === parts[0] ||
        (custom && route.schemeHost === parts[0]),
    );
    if (!target || !uuid.test(parts[1])) return null;
    return `${target.shell}?id=${parts[1]}`;
  } catch {
    return null;
  }
}
