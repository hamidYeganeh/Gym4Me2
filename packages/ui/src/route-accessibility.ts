/** SSGOI briefly reinserts outgoing route DOM so it can animate after unmount. */
export function isolateInactiveRoutes(
  root: HTMLElement,
  activeRoute: () => HTMLElement | null,
) {
  const saved = new Map<
    HTMLElement,
    { inert: boolean; hidden: string | null }
  >();
  const restore = (element: HTMLElement) => {
    const previous = saved.get(element);
    if (!previous) return;
    element.inert = previous.inert;
    if (previous.hidden === null) element.removeAttribute("aria-hidden");
    else element.setAttribute("aria-hidden", previous.hidden);
    saved.delete(element);
  };
  const sync = () => {
    // A Suspense boundary can hydrate after its parent's layout effect.
    // Only the committed React ref can identify an outgoing node safely.
    const current = activeRoute();
    if (!current) return;
    for (const element of saved.keys())
      if (!root.contains(element)) restore(element);
    const provider = root.querySelector("[data-ssgoi-root]");
    for (const element of root.querySelectorAll<HTMLElement>(
      "[data-ssgoi-transition]",
    )) {
      // The outer route owns nested boundaries; nested providers own themselves.
      if (
        element.closest("[data-ssgoi-root]") !== provider ||
        element.parentElement?.closest("[data-ssgoi-transition]")
      )
        continue;
      if (element === current) {
        restore(element);
        continue;
      }
      if (!saved.has(element))
        saved.set(element, {
          inert: element.inert,
          hidden: element.getAttribute("aria-hidden"),
        });
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    }
  };
  const observer = new MutationObserver(sync);
  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-ssgoi-transition"],
  });
  sync();
  return {
    sync,
    dispose() {
      observer.disconnect();
      for (const element of saved.keys()) restore(element);
    },
  };
}
