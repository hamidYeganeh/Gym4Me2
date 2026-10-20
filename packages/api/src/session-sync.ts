import type { ApiApplication } from "./transport";

/** Notify same-origin tabs to discard account caches; never send identity or credentials. */
export function connectSessionSync(
  application: ApiApplication,
  baseUrl: string,
  onReset: () => void,
) {
  const name = `gym4me:session:${application}:${baseUrl.replace(/\/$/, "")}`;
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(name);
      channel.onmessage = (event: MessageEvent<unknown>) => {
        if (event.data === "reset") onReset();
      };
      return {
        publish: () => channel.postMessage("reset"),
        close: () => channel.close(),
      };
    }
  } catch {
    /* Restricted webviews can still use the storage notification fallback. */
  }
  if (typeof window === "undefined") return { publish() {}, close() {} };
  const receive = (event: StorageEvent) => {
    if (event.key === name && event.newValue) onReset();
  };
  window.addEventListener("storage", receive);
  return {
    publish() {
      try {
        window.localStorage.setItem(name, `${Date.now()}:${Math.random()}`);
        window.localStorage.removeItem(name);
      } catch {
        /* Storage may be disabled; the local cache reset still succeeds. */
      }
    },
    close: () => window.removeEventListener("storage", receive),
  };
}
