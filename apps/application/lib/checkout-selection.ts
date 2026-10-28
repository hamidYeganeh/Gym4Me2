"use client";
import { useSyncExternalStore } from "react";
const key = "gym4me:checkout-selection";
let memory = "";
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function snapshot() {
  try {
    return sessionStorage.getItem(key) ?? memory;
  } catch {
    return memory;
  }
}
export function storeCheckoutSelection(service: string, occurrence: string) {
  memory = JSON.stringify({ service, occurrence });
  try { sessionStorage.setItem(key, memory); } catch { /* Keep this checkout available in memory. */ }
  listeners.forEach((listener) => listener());
}
export function useCheckoutSelection(): {
  service?: string;
  occurrence?: string;
} {
  const value = useSyncExternalStore(subscribe, snapshot, () => "");
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}
