import { isActiveSurfaceElement } from "@repo/ui/lib/active-surface";

/** A missing-page retry replaces its entire state; restore into the same active page only. */
export function restoreCatalogRetryFocus(
  surface: HTMLElement | null,
  path: string,
) {
  requestAnimationFrame(() => {
    if (
      !surface?.isConnected ||
      `${window.location.pathname}${window.location.search}` !== path ||
      document.activeElement !== document.body
    )
      return;
    const target = [
      ...surface.querySelectorAll<HTMLAnchorElement>(
        "main nav a[href], main header a[href]",
      ),
    ].find(isActiveSurfaceElement);
    target?.focus();
  });
}
