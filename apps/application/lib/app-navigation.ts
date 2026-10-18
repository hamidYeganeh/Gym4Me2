import {
  dismissTopOverlay,
  overlayHistoryOpen,
  overlayHistoryId,
} from "@repo/ui/lib/overlay-history";

type Router = { back(): void; replace(href: string): void };
type HistoryPort = Pick<
  History,
  "state" | "length" | "pushState" | "replaceState"
>;
export type AppNavigationEvent = {
  type: "push" | "replace" | "commit" | "back";
  atMs: number;
  from: string;
  to: string | null;
  outcome: string;
};
const observers = new Set<(event: AppNavigationEvent) => void>();
export function observeAppNavigation(
  observer: (event: AppNavigationEvent) => void,
) {
  observers.add(observer);
  return () => {
    observers.delete(observer);
  };
}
export type NavigationEnvironment = {
  history: HistoryPort;
  href(): string;
  scope(): string;
  id(): string;
  now(): number;
  listenPop(listener: () => void): () => void;
  overlayOpen(): boolean;
  dismissOverlay(): void;
  observe?(event: AppNavigationEvent): void;
};
type Entry = {
  scope: string;
  id: string;
  href: string;
  parentId: string | null;
  parentHref: string | null;
};
const STATE_KEY = "__gym4meNavigationV1";
const STORAGE_KEY = "gym4me.navigation.scope.v1";
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null &&
  typeof value === "object" &&
  (Object.getPrototypeOf(value) === Object.prototype ||
    Object.getPrototypeOf(value) === null);
const intermediate = new Set([
  "/login",
  "/auth/otp",
  "/auth/login",
  "/reset-password",
  "/set-password",
  "/profile/complete",
  "/checkout/mock-gateway",
  "/checkout/status",
]);
/** Normalize native trailing slashes, but retain filter/identifier query parameters. */
function localHref(value: string, base: string): string | null {
  try {
    const url = new URL(value, base),
      origin = new URL(base);
    if (
      url.protocol !== origin.protocol ||
      url.host !== origin.host ||
      url.username ||
      url.password ||
      url.pathname.startsWith("//")
    )
      return null;
    return (url.pathname.replace(/\/$/, "") || "/") + url.search + url.hash;
  } catch {
    return null;
  }
}
function parentHref(parent: string | null, base: string) {
  return parent?.startsWith("/") &&
    !parent.startsWith("//") &&
    !parent.includes("\\")
    ? localHref(parent, base)
    : null;
}

/** Adds only namespaced metadata; Next/SSGOI own router state stays opaque. */
export function createAppNavigation(env: NavigationEnvironment) {
  const { history } = env,
    scope = env.scope();
  const previousPush = history.pushState,
    previousReplace = history.replaceState;
  let live = true;
  let pending: {
    kind: "page" | "overlay";
    from: string;
    destination: string | null;
    started: number;
    committed: boolean;
    resetParentAt: string | null;
    overlayId: string | null;
  } | null = null;
  const currentHref = () => localHref(env.href(), env.href())!;
  const report = (
    type: AppNavigationEvent["type"],
    outcome: string,
    to: string | null,
  ) => {
    // QA observers get paths only: never query credentials or router internals.
    const path = (href: string) => new URL(href, env.href()).pathname;
    try {
      env.observe?.({
        type,
        outcome,
        atMs: env.now(),
        from: path(currentHref()),
        to: to ? path(to) : null,
      });
    } catch {
      /* Diagnostics must never change navigation behavior. */
    }
  };
  const supersede = (target: string) => {
    if (
      pending?.kind === "page" &&
      target !== pending.from &&
      target !== pending.destination
    )
      pending = null;
  };
  const entry = (): Entry | null => {
    const state: unknown = history.state;
    const value = record(state) ? state[STATE_KEY] : undefined;
    if (
      !record(value) ||
      value.scope !== scope ||
      typeof value.id !== "string" ||
      typeof value.href !== "string" ||
      value.href !== currentHref() ||
      !(value.parentId === null || typeof value.parentId === "string") ||
      !(value.parentHref === null || typeof value.parentHref === "string")
    )
      return null;
    return value as Entry;
  };
  const stamp = (data: Record<string, unknown>, value: Entry) => ({
    ...data,
    [STATE_KEY]: value,
  });
  // A fresh/cold entry has no known in-app predecessor, even when browser history is long.
  if (!entry() && (record(history.state) || history.state == null))
    previousReplace.call(
      history,
      stamp(record(history.state) ? history.state : {}, {
        scope,
        id: env.id(),
        href: currentHref(),
        parentId: null,
        parentHref: null,
      }),
      "",
      env.href(),
    );
  const push: History["pushState"] = (data: unknown, unused, url) => {
    if (!live || !record(data))
      return previousPush.call(history, data, unused, url);
    const target = localHref(String(url ?? env.href()), env.href());
    if (!target) return previousPush.call(history, data, unused, url);
    supersede(target);
    report("push", "requested", target);
    const parent = entry();
    previousPush.call(
      history,
      stamp(data, {
        scope,
        id: env.id(),
        href: target,
        parentId: parent?.id ?? null,
        parentHref: parent?.href ?? null,
      }),
      unused,
      url,
    );
  };
  const replace: History["replaceState"] = (data: unknown, unused, url) => {
    if (!live || !record(data))
      return previousReplace.call(history, data, unused, url);
    const target = localHref(String(url ?? env.href()), env.href());
    if (!target) return previousReplace.call(history, data, unused, url);
    supersede(target);
    report("replace", "requested", target);
    const resetParent =
      pending?.kind === "page" && pending.resetParentAt === target;
    const current = resetParent ? null : entry();
    previousReplace.call(
      history,
      stamp(data, {
        scope,
        id: current?.id ?? env.id(),
        href: target,
        parentId: current?.parentId ?? null,
        parentHref: current?.parentHref ?? null,
      }),
      unused,
      url,
    );
    if (resetParent && pending) pending.resetParentAt = null;
  };
  history.pushState = push;
  history.replaceState = replace;
  const removePop = env.listenPop(() => {
    if (
      pending?.kind === "overlay" &&
      pending.overlayId !== overlayHistoryId(history.state)
    )
      pending.committed = true;
    if (
      pending?.kind === "page" &&
      pending.destination === currentHref() &&
      pending.from.split("#")[0] === pending.destination.split("#")[0]
    )
      pending.committed = true;
  });
  function canGoBack() {
    const current = entry(),
      parent = current?.parentHref;
    if (
      history.length < 2 ||
      !current?.parentId ||
      !parent ||
      parent === current.href ||
      localHref(parent, env.href()) !== parent
    )
      return false;
    return !intermediate.has(
      new URL(parent, env.href()).pathname.replace(/\/$/, "") || "/",
    );
  }
  return {
    canGoBack,
    commit(pathname: string, search: string) {
      const route = localHref(
        pathname + (search ? `?${search}` : ""),
        env.href(),
      );
      const accepted =
        !!pending &&
        pending.kind === "page" &&
        route === pending.destination?.split("#")[0] &&
        route === currentHref().split("#")[0];
      report("commit", accepted ? "destination" : "unrelated", route);
      if (accepted && pending) pending.committed = true;
    },
    back(router: Router, parent: string | null, allowHistory = true): boolean {
      const age = pending ? env.now() - pending.started : 0;
      if (pending) {
        const overlayFinished =
          pending.kind === "overlay" &&
          !env.overlayOpen() &&
          !overlayHistoryOpen(history.state) &&
          !(record(history.state) && history.state.lumaOverlay);
        const cancelled = age >= 2000 && pending.from === currentHref();
        if (age < 400 || !(pending.committed || overlayFinished || cancelled)) {
          report("back", "locked", pending.destination);
          return true;
        }
        pending = null;
      }
      if (env.overlayOpen()) {
        pending = {
          kind: "overlay",
          from: currentHref(),
          destination: null,
          started: env.now(),
          committed: false,
          resetParentAt: null,
          overlayId: overlayHistoryId(history.state),
        };
        report("back", "overlay", null);
        env.dismissOverlay();
        return true;
      }
      const safeParent = parentHref(parent, env.href());
      const historyBack = allowHistory && canGoBack();
      if (!historyBack && (!safeParent || safeParent === currentHref())) {
        report("back", "unavailable", safeParent);
        return false;
      }
      pending = {
        kind: "page",
        from: currentHref(),
        destination: historyBack ? entry()!.parentHref : safeParent,
        started: env.now(),
        committed: false,
        resetParentAt: historyBack ? null : safeParent,
        overlayId: null,
      };
      report("back", historyBack ? "history" : "parent", pending.destination);
      try {
        if (historyBack) router.back();
        else router.replace(safeParent!);
      } catch (error) {
        pending = null;
        throw error;
      }
      return true;
    },
    dispose() {
      live = false;
      removePop();
      // Another router may have wrapped us. Do not overwrite its newer wrapper.
      if (history.pushState === push) history.pushState = previousPush;
      if (history.replaceState === replace)
        history.replaceState = previousReplace;
    },
  };
}
let active: ReturnType<typeof createAppNavigation> | null = null;
export function registerAppNavigation() {
  const instance = createAppNavigation({
    history: window.history,
    href: () => window.location.href,
    scope: () => {
      try {
        const old = sessionStorage.getItem(STORAGE_KEY);
        if (old) return old;
        const value = crypto.randomUUID();
        sessionStorage.setItem(STORAGE_KEY, value);
        return value;
      } catch {
        return crypto.randomUUID();
      }
    },
    id: () => crypto.randomUUID(),
    now: () => performance.now(),
    listenPop: (listener) => {
      window.addEventListener("popstate", listener);
      return () => window.removeEventListener("popstate", listener);
    },
    overlayOpen: () =>
      !!document.querySelector('[role="dialog"][data-state="open"]'),
    dismissOverlay: () => {
      if (dismissTopOverlay()) return;
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
          cancelable: true,
        }),
      );
    },
    observe: (event) => {
      for (const observer of observers) {
        try {
          observer(event);
        } catch {
          /* Isolate optional QA subscribers. */
        }
      }
    },
  });
  active = instance;
  return () => {
    instance.dispose();
    if (active === instance) active = null;
  };
}
export function commitAppRoute(path: string, search: string) {
  active?.commit(path, search);
}
export function performAppBack(
  router: Router,
  parent: string | null,
  allowHistory = true,
) {
  if (active) return active.back(router, parent, allowHistory);
  if (typeof window !== "undefined") {
    const fallback = parentHref(parent, window.location.href);
    if (
      fallback &&
      fallback !== localHref(window.location.href, window.location.href)
    ) {
      router.replace(fallback);
      return true;
    }
  }
  return false;
}
