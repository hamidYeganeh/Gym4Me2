"use client";

import { useRef, useState, type RefObject } from "react";
import { useActionFocus } from "./use-action-focus";

/** Keep keyboard focus after a retry without overriding a user's next action. */
export function useQueryRetry(
  retry: () => unknown,
  fallback?: RefObject<HTMLElement | null>,
) {
  const button = useRef<HTMLButtonElement>(null);
  const pending = useRef(false);
  const [retrying, setRetrying] = useState(false);
  const beginFocus = useActionFocus(retrying);

  const run = () => {
    if (pending.current) return;
    const finishFocus = beginFocus(
      () => button.current ?? fallback?.current ?? null,
      document.activeElement === button.current ? button.current : null,
    );
    pending.current = true;
    setRetrying(true);
    const complete = () => {
      pending.current = false;
      setRetrying(false);
      finishFocus();
    };
    void Promise.resolve().then(retry).then(complete, complete);
  };

  return { button, retrying, run };
}
