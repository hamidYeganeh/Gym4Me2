"use client";
import { useSyncExternalStore } from "react";
import { getTehranDate } from "../../lib/club-schedule";

function subscribe(listener: () => void) {
  window.addEventListener("focus", listener);
  document.addEventListener("visibilitychange", listener);
  const interval = window.setInterval(listener, 60000);
  return () => {
    window.removeEventListener("focus", listener);
    document.removeEventListener("visibilitychange", listener);
    window.clearInterval(interval);
  };
}

export function useTehranDay() {
  return useSyncExternalStore(subscribe, getTehranDate, () => "");
}
