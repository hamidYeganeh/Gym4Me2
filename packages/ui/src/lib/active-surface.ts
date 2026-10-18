/** Async callbacks must not move focus/scroll into an outgoing route or modal background. */
export function isActiveSurfaceElement(element: Element | null) {
  return Boolean(
    element?.isConnected &&
    !element.closest('[inert], [aria-hidden="true"]') &&
    element.getClientRects().length,
  );
}

export function activeSurfaceTarget(id: string) {
  const element = document.getElementById(id);
  return isActiveSurfaceElement(element) ? element : null;
}

/** Radix releases aria-hidden on the background after its close autofocus event. */
export function restoreOverlayFocus(trigger: HTMLElement | null) {
  const closingFocus = document.activeElement;
  requestAnimationFrame(() => {
    if (!isActiveSurfaceElement(trigger)) return;
    const current = document.activeElement;
    // Do not steal focus if another dialog or the user already selected a control.
    if (
      current === document.body ||
      current === closingFocus ||
      !isActiveSurfaceElement(current)
    )
      trigger?.focus({ preventScroll: true });
  });
}
