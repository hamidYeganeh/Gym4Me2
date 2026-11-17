const key = "gym4me.applicant.session";
const eventName = "gym4me:session";
let memoryToken: string | null = null;

export function subscribe(listener: () => void) {
  window.addEventListener(eventName, listener);
  return () => window.removeEventListener(eventName, listener);
}

export function readToken() {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return memoryToken;
  }
}

export function writeToken(token: string | null) {
  memoryToken = token;
  try {
    if (token) window.sessionStorage.setItem(key, token);
    else window.sessionStorage.removeItem(key);
  } catch {
    // Keep the session usable in memory when browser storage is unavailable.
  }
  window.dispatchEvent(new Event(eventName));
}
