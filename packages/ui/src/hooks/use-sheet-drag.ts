"use client";

import { useRef, type PointerEvent } from "react";

/** Only the grabber owns the gesture. Scrolling a form never dismisses it. */
export function useSheetDrag(close: () => void) {
  const gesture = useRef<{ y: number; at: number; panel: HTMLElement } | null>(
    null,
  );
  function reset() {
    const current = gesture.current;
    if (current) {
      current.panel.style.removeProperty("--sheet-drag");
      delete current.panel.dataset.dragging;
    }
    gesture.current = null;
  }
  return {
    onPointerDown(event: PointerEvent<HTMLButtonElement>) {
      if (!event.isPrimary || event.button !== 0) return;
      const panel = event.currentTarget.closest<HTMLElement>(
        '[data-slot="sheet-content"], [data-slot="dialog-content"]',
      );
      if (!panel) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      gesture.current = { y: event.clientY, at: performance.now(), panel };
      panel.dataset.dragging = "true";
    },
    onPointerMove(event: PointerEvent<HTMLButtonElement>) {
      const current = gesture.current;
      if (!current) return;
      const distance = Math.max(0, event.clientY - current.y);
      current.panel.style.setProperty("--sheet-drag", `${distance}px`);
    },
    onPointerUp(event: PointerEvent<HTMLButtonElement>) {
      const current = gesture.current;
      if (!current) return;
      const distance = event.clientY - current.y;
      const velocity = distance / Math.max(1, performance.now() - current.at);
      reset();
      // The owner's controlled onOpenChange still protects pending commands.
      if (distance > 90 || (distance > 35 && velocity > 0.65)) close();
    },
    onPointerCancel: reset,
    onLostPointerCapture: reset,
  };
}
