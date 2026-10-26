"use client";

import { useEffect, useRef } from "react";
import { toast } from "../kit/Sileo";

const announcedErrors = new WeakSet<object>();

/** Announce each result once, including under Strict Mode's effect replay. */
export function useFeedbackToast(
  variant: "error" | "success",
  message: string,
  occurrence: unknown,
) {
  const shown = useRef<unknown>(null);
  useEffect(() => {
    if (!occurrence) {
      shown.current = null;
      return;
    }
    if (Object.is(shown.current, occurrence)) return;
    shown.current = occurrence;
    if (variant === "error" && typeof occurrence === "object") {
      if (announcedErrors.has(occurrence)) return;
      announcedErrors.add(occurrence);
    }
    toast[variant](message);
  }, [variant, message, occurrence]);
}
