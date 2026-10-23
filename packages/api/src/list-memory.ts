/** Session-only UI preferences. Never store tokens, messages or private media here. */
const prefix = "gym4me.list.v1:";
const memory = new Map<string, string>();
let pendingErase = false;
function eraseStored() {
  const keys = Array.from({ length: window.sessionStorage.length }, (_, i) =>
    window.sessionStorage.key(i),
  );
  for (const key of keys)
    if (key?.startsWith(prefix)) window.sessionStorage.removeItem(key);
  pendingErase = false;
}
const event = "gym4me:list-memory";
export function readListMemory(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    if (pendingErase) eraseStored();
    return (
      window.sessionStorage.getItem(prefix + key) ?? memory.get(key) ?? null
    );
  } catch {
    return memory.get(key) ?? null;
  }
}
export function writeListMemory(key: string, value: string) {
  memory.set(key, value);
  try {
    if (pendingErase) eraseStored();
    window.sessionStorage.setItem(prefix + key, value);
  } catch {
    /* Private browsing/quota: memory remains usable. */
  }
  window.dispatchEvent(new Event(event));
}
export function subscribeListMemory(listener: () => void) {
  window.addEventListener(event, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(event, listener);
    window.removeEventListener("storage", listener);
  };
}
export function clearListMemory() {
  memory.clear();
  if (typeof window === "undefined") return;
  try {
    eraseStored();
  } catch {
    pendingErase = true; /* Retry erasure before any later read. */
  }
  window.dispatchEvent(new Event(event));
}
