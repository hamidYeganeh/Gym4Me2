"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";

/** Motion can retain a closing portal, so a reopen need not remount its focus scope. */
export function useOverlayReopenFocus(
  open: boolean,
  content: RefObject<HTMLElement | null>,
  onOpenAutoFocus?: (event: Event) => void,
) {
  const wasOpen = useRef(open);
  useLayoutEffect(() => {
    const reopening = open && !wasOpen.current;
    wasOpen.current = open;
    const panel = content.current;
    if (!reopening || !panel || panel.contains(document.activeElement)) return;
    const event = new Event("openAutoFocus", { cancelable: true });
    onOpenAutoFocus?.(event);
    if (event.defaultPrevented) return;
    const target = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      ),
    ).find(
      (element) =>
        element.getClientRects().length &&
        !element.closest('[inert], [aria-hidden="true"]'),
    );
    (target ?? panel).focus({ preventScroll: true });
  }, [open, content, onOpenAutoFocus]);
  // Exiting portal elements retain old callbacks; those callbacks need live state.
  return wasOpen;
}
