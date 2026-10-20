type Origin = { route: string; key: string | null; index: number };
let pending: Origin | null = null;
const origins = new Map<string, number | null>();
const exitAttribute = "data-zoom-exit-key";

/** Capture the actual link opener, including keyboard activation, above protected cards. */
export function rememberClubMotionOrigin(target: EventTarget | null) {
  if (!(target instanceof Element)) return;
  const link = target.closest("a[href]");
  const route = link?.closest<HTMLElement>("[data-ssgoi-transition]");
  if (!link || !route) return;
  const anchor = link.closest("article")?.querySelector(`[${exitAttribute}]`);
  const key = anchor?.getAttribute(exitAttribute) ?? null;
  const matches = [...route.querySelectorAll(`[${exitAttribute}]`)].filter(
    (element) => element.getAttribute(exitAttribute) === key,
  );
  pending = {
    route: route.dataset.ssgoiTransition ?? "",
    key,
    index: anchor ? matches.indexOf(anchor) : -1,
  };
}

/** Temporarily disambiguate duplicate keys while SSGOI captures its geometry. */
export function withClubMotionOrigin<T>(
  from: HTMLElement,
  to: HTMLElement,
  backward: boolean,
  build: () => T,
): T | undefined {
  const list = backward ? to : from;
  const detail = backward ? from : to;
  const enters = detail.querySelectorAll("[data-zoom-enter-key]");
  const intent = pending;
  pending = null;
  if (enters.length !== 1) return;
  const key = enters[0]?.getAttribute("data-zoom-enter-key");
  if (!key) return;
  const route = list.dataset.ssgoiTransition ?? "";
  const identity = `${route}\n${key}`;
  if (!backward && intent?.route !== route) return;
  if (!backward && intent?.route === route) {
    origins.delete(identity);
    origins.set(identity, intent.key === key ? intent.index : null);
    if (origins.size > 64) origins.delete(origins.keys().next().value!);
  }
  const index = origins.get(identity);
  if (index == null || index < 0) return;
  const matches = [...list.querySelectorAll(`[${exitAttribute}]`)].filter(
    (element) => element.getAttribute(exitAttribute) === key,
  );
  const selected = matches[index];
  if (!selected) return;
  const others = matches.filter((element) => element !== selected);
  for (const element of others) element.removeAttribute(exitAttribute);
  try {
    return build();
  } finally {
    for (const element of others) element.setAttribute(exitAttribute, key);
  }
}
