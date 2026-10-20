"use client";

import { useEffect, useRef, useState } from "react";
import { restoreActionFocus, type ActionFocus } from "../lib/action-focus";

/** Capture intent now, then complete it after the enabled destination is committed. */
export function useActionFocus(busy: boolean) {
  const attempt = useRef<ActionFocus | null>(null);
  const [completed, setCompleted] = useState(0);
  useEffect(() => {
    if (busy || !attempt.current) return;
    const action = attempt.current;
    const frame = requestAnimationFrame(() => {
      if (attempt.current !== action) return;
      attempt.current = null;
      restoreActionFocus(action);
    });
    return () => cancelAnimationFrame(frame);
  }, [busy, completed]);

  return (
    target: () => HTMLElement | null,
    origin: Element | null = document.activeElement,
  ) => {
    if (!(origin instanceof HTMLElement) || origin === document.body)
      return () => {};
    const action: ActionFocus = {
      origin,
      target,
      location:
        window.location.pathname +
        window.location.search +
        window.location.hash,
    };
    let finished = false;
    return () => {
      if (finished) return;
      finished = true;
      attempt.current = action;
      setCompleted((value) => value + 1);
    };
  };
}
