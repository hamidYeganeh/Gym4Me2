"use client";

import { useRef, useState } from "react";
import { isActiveSurfaceElement } from "../lib/active-surface";

/** Keep keyboard focus after a retry without overriding a user's next action. */
export function useQueryRetry(retry: () => unknown) {
  const button = useRef<HTMLButtonElement>(null);
  const pending = useRef(false);
  const [retrying, setRetrying] = useState(false);

  const run = () => {
    if (pending.current) return;
    const restoreFocus = document.activeElement === button.current;
    pending.current = true;
    setRetrying(true);
    const complete = () => {
      pending.current = false;
      setRetrying(false);
      requestAnimationFrame(() => {
        if (
          restoreFocus &&
          isActiveSurfaceElement(button.current) &&
          (document.activeElement === document.body ||
            document.activeElement === button.current)
        )
          button.current?.focus();
      });
    };
    void Promise.resolve().then(retry).then(complete, complete);
  };

  return { button, retrying, run };
}
