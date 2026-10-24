"use client";
import { useEffect, useRef } from "react";
import { trackOverlayHistory } from "../lib/overlay-history";

export function useOverlayHistory(
  open: boolean,
  onOpenChange: (open: boolean) => void,
) {
  const change = useRef(onOpenChange);
  const visible = useRef(open);
  useEffect(() => {
    change.current = onOpenChange;
    visible.current = open;
  }, [onOpenChange, open]);
  useEffect(() => {
    visible.current = open;
    if (!open) return;
    const location = window.location.href;
    let frame = 0;
    let remove: () => void;
    const dismiss = () => {
      change.current(false);
      // Controlled forms can reject dismissal while a command is pending.
      // After React settles, restore their history entry for the next Back.
      frame = requestAnimationFrame(() => {
        if (visible.current && window.location.href === location) {
          remove();
          remove = trackOverlayHistory(dismiss);
        }
      });
    };
    remove = trackOverlayHistory(dismiss);
    return () => {
      cancelAnimationFrame(frame);
      remove();
    };
  }, [open]);
}
