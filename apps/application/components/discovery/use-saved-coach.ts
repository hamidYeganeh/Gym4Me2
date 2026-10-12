"use client";
import { useSyncExternalStore } from "react";
const eventName = "gym4me:saved-coaches";
const memory = new Map<string, boolean>();
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(eventName, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(eventName, listener);
  };
}
export function useSavedCoach(id: string) {
  const key = `gym4me:coach:${id}:saved`;
  const saved = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key) === "true";
      } catch {
        return memory.get(id) ?? false;
      }
    },
    () => false,
  );
  return [
    saved,
    (value: boolean) => {
      memory.set(id, value);
      try {
        localStorage.setItem(key, String(value));
      } catch {
        /* Keep session state when storage is unavailable. */
      }
      window.dispatchEvent(new Event(eventName));
    },
  ] as const;
}
