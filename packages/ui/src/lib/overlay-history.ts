export const OVERLAY_HISTORY_KEY = "__gym4meOverlaysV1";
type OverlayState = Record<string, unknown>;
export type OverlayEnvironment = {
  state(): unknown;
  href(): string;
  id(): string;
  push(state: OverlayState): void;
  replace(state: OverlayState): void;
  back(): void;
  listen(listener: () => void): () => void;
};
function stateObject(state: unknown): OverlayState {
  return state !== null && typeof state === "object" && !Array.isArray(state)
    ? (state as OverlayState)
    : {};
}
export function overlayHistoryOpen(state: unknown) {
  const ids = stateObject(state)[OVERLAY_HISTORY_KEY];
  return Array.isArray(ids) && ids.length > 0;
}
export function overlayHistoryId(state: unknown): string | null {
  const object = stateObject(state);
  const ids = object[OVERLAY_HISTORY_KEY];
  const id = Array.isArray(ids) ? ids.at(-1) : object.lumaOverlay;
  return typeof id === "string" ? id : null;
}

/** One stack for athlete and host sheets. Only its top layer handles Back. */
export function createOverlayHistory(env: OverlayEnvironment) {
  type Entry = {
    id: string;
    href: string;
    dismiss(): void;
    attached: boolean;
    closing: boolean;
  };
  const entries: Entry[] = [];
  const retired = new Map<string, string>();
  let traversing = false;
  const ids = () => {
    const value = stateObject(env.state())[OVERLAY_HISTORY_KEY];
    return Array.isArray(value)
      ? value.filter((id): id is string => typeof id === "string")
      : [];
  };
  const attach = (entry: Entry) => {
    if (traversing || entry.closing || entry.attached) return;
    const parents = entries.filter(
      (other) =>
        other !== entry &&
        other.attached &&
        !other.closing &&
        other.href === env.href(),
    );
    entry.attached = true;
    env.push({
      ...stateObject(env.state()),
      [OVERLAY_HISTORY_KEY]: [...parents.map((other) => other.id), entry.id],
    });
  };
  const pop = () => {
    const current = ids();
    const top = current.at(-1);
    // Closing a parent beneath a child leaves a retired entry to drain on Back.
    if (
      top &&
      retired.get(top) === env.href() &&
      (traversing || entries.some((entry) => entry.attached && !entry.closing))
    ) {
      traversing = true;
      env.back();
      return;
    }
    traversing = false;
    for (const entry of [...entries].reverse()) {
      if (
        !entry.closing &&
        (entry.href !== env.href() ||
          (entry.attached && !current.includes(entry.id)))
      ) {
        entry.closing = true;
        entry.dismiss();
      }
    }
    // Forward into a closed sheet must not reopen it or trap browser history.
    if (top && retired.has(top)) {
      const state = { ...stateObject(env.state()) };
      delete state[OVERLAY_HISTORY_KEY];
      env.replace(state);
    }
    for (const entry of entries) attach(entry);
  };
  const unlisten = env.listen(pop);
  return {
    open(dismiss: () => void) {
      const entry: Entry = {
        id: env.id(),
        href: env.href(),
        dismiss,
        attached: false,
        closing: false,
      };
      entries.push(entry);
      attach(entry);
      return () => {
        const index = entries.indexOf(entry);
        if (index < 0) return;
        entries.splice(index, 1);
        retired.set(entry.id, entry.href);
        if (retired.size > 128) retired.delete(retired.keys().next().value!);
        if (
          entry.attached &&
          !entry.closing &&
          entry.href === env.href() &&
          ids().at(-1) === entry.id
        ) {
          traversing = true;
          env.back();
        }
      };
    },
    dismissTop() {
      const entry = entries.filter((entry) => entry.href === env.href()).at(-1);
      if (!entry) return false;
      if (!entry.closing) {
        entry.closing = true;
        // Cleanup must drain the owned history entry for a programmatic close.
        if (entry.attached && ids().at(-1) === entry.id) {
          traversing = true;
          env.back();
        }
        entry.dismiss();
      }
      return true;
    },
    dispose() {
      unlisten();
    },
  };
}

let browserHistory: ReturnType<typeof createOverlayHistory> | undefined;
function sharedHistory() {
  return (browserHistory ??= createOverlayHistory({
    state: () => window.history.state,
    href: () => window.location.href,
    id: () => crypto.randomUUID(),
    push: (state) => window.history.pushState(state, "", window.location.href),
    replace: (state) =>
      window.history.replaceState(state, "", window.location.href),
    back: () => window.history.back(),
    listen: (listener) => {
      window.addEventListener("popstate", listener);
      return () => window.removeEventListener("popstate", listener);
    },
  }));
}
export const trackOverlayHistory = (dismiss: () => void) =>
  sharedHistory().open(dismiss);
export const dismissTopOverlay = () => browserHistory?.dismissTop() ?? false;
