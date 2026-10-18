"use client";
import { useEffect, useRef } from "react";
import { trackOverlayHistory } from "../lib/overlay-history";

export function useOverlayHistory(
  open: boolean,
  onOpenChange: (open: boolean) => void,
) {
  const change = useRef(onOpenChange);
  useEffect(() => {
    change.current = onOpenChange;
  }, [onOpenChange]);
  useEffect(() => {
    if (open) return trackOverlayHistory(() => change.current(false));
  }, [open]);
}
