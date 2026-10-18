import assert from "node:assert/strict";
import test from "node:test";
import {
  createAppNavigation,
  type NavigationEnvironment,
} from "../lib/app-navigation";

function browser(
  initial = "/invitations/sports",
  base = "https://gym4me.test",
) {
  let index = 0,
    time = 0,
    serial = 0,
    open = false,
    dismissed = 0;
  const stack = [{ url: new URL(initial, base).href, state: null as unknown }];
  const pop = new Set<() => void>();
  const history = {
    get state() {
      return stack[index]!.state;
    },
    get length() {
      return stack.length;
    },
    pushState(data: unknown, _unused: string, url?: string | URL | null) {
      stack.splice(index + 1);
      stack.push({
        url: new URL(String(url ?? stack[index]!.url), stack[index]!.url).href,
        state: structuredClone(data),
      });
      index++;
    },
    replaceState(data: unknown, _unused: string, url?: string | URL | null) {
      stack[index] = {
        url: new URL(String(url ?? stack[index]!.url), stack[index]!.url).href,
        state: structuredClone(data),
      };
    },
  };
  const traverse = (direction: number) => {
    if (index + direction < 0 || index + direction >= stack.length) return;
    index += direction;
    for (const listener of pop) listener();
  };
  const env: NavigationEnvironment = {
    history,
    href: () => stack[index]!.url,
    scope: () => "test-tab",
    id: () => `entry-${++serial}`,
    now: () => time,
    listenPop: (listener) => {
      pop.add(listener);
      return () => pop.delete(listener);
    },
    overlayOpen: () => open,
    dismissOverlay: () => {
      open = false;
      dismissed++;
    },
  };
  const calls: string[] = [];
  const router = {
    back() {
      calls.push("back");
      traverse(-1);
    },
    replace(href: string) {
      calls.push(`replace:${href}`);
      history.replaceState({ __NA: true }, "", href);
    },
  };
  return {
    env,
    history,
    router,
    calls,
    href: () => new URL(env.href()).pathname + new URL(env.href()).search,
    advance: (ms = 500) => {
      time += ms;
    },
    overlay: (value: boolean) => {
      open = value;
    },
    dismissed: () => dismissed,
    traverse,
    commit: (navigation: ReturnType<typeof createAppNavigation>) => {
      const u = new URL(env.href());
      navigation.commit(u.pathname, u.search.slice(1));
    },
  };
}
test("an internal push returns to the invitation and preserves the router's opaque state", () => {
  const b = browser(),
    n = createAppNavigation(b.env);
  const state = {
    __NA: true,
    __PRIVATE_NEXTJS_INTERNALS_TREE: {
      tree: ["", { children: ["services", {}] }],
    },
  };
  b.history.pushState(state, "", "/services/detail?id=service&date=tomorrow");
  const saved = b.history.state;
  assert.ok(
    saved &&
      typeof saved === "object" &&
      "__PRIVATE_NEXTJS_INTERNALS_TREE" in saved,
  );
  assert.deepEqual(
    saved.__PRIVATE_NEXTJS_INTERNALS_TREE,
    state.__PRIVATE_NEXTJS_INTERNALS_TREE,
  );
  assert.equal(n.canGoBack(), true);
  assert.equal(n.back(b.router, "/services"), true);
  assert.equal(b.href(), "/invitations/sports");
  assert.deepEqual(b.calls, ["back"]);
  b.commit(n);
  b.advance();
  n.back(b.router, "/");
  assert.equal(b.href(), "/");
  n.dispose();
});
test("cold entries never trust unrelated history length, and replace preserves a real predecessor across reload", () => {
  const cold = browser("/unrelated");
  cold.history.pushState({ foreign: true }, "", "/services/detail?id=one");
  const n = createAppNavigation(cold.env);
  assert.equal(n.canGoBack(), false);
  n.back(cold.router, "/services");
  assert.deepEqual(cold.calls, ["replace:/services"]);
  n.dispose();
  const b = browser(),
    first = createAppNavigation(b.env);
  b.history.pushState({ __NA: true }, "", "/services/detail?id=one");
  b.history.replaceState(
    { __NA: true },
    "",
    "/services/detail?id=two&branch=north",
  );
  first.dispose();
  const afterReload = createAppNavigation(b.env);
  afterReload.back(b.router, "/services");
  assert.equal(b.href(), "/invitations/sports");
  afterReload.dispose();
});
test("overlay dismissal precedes traversal, and rapid Back cannot skip two pages", () => {
  const b = browser("/"),
    n = createAppNavigation(b.env);
  b.history.pushState({ __NA: true }, "", "/invitations/sports");
  b.history.pushState({ __NA: true }, "", "/services/detail?id=one");
  b.overlay(true);
  const beforeSheet = b.history.state;
  assert.ok(beforeSheet && typeof beforeSheet === "object");
  b.history.pushState(
    { ...beforeSheet, lumaOverlay: "sheet" },
    "",
    b.env.href(),
  );
  n.back(b.router, "/services");
  assert.equal(b.dismissed(), 1);
  assert.deepEqual(b.calls, []);
  // React sheet cleanup removes precisely its own history entry.
  b.traverse(-1);
  b.advance();
  n.back(b.router, "/services");
  n.back(b.router, "/services");
  assert.equal(b.href(), "/invitations/sports");
  assert.deepEqual(b.calls, ["back"]);
  b.commit(n);
  n.back(b.router, "/");
  assert.deepEqual(b.calls, ["back"]);
  b.advance();
  n.back(b.router, "/");
  assert.equal(b.href(), "/");
  n.dispose();
});
test("a slow router retains the Back lock until the destination commits", () => {
  const b = browser(),
    n = createAppNavigation(b.env);
  b.history.pushState({ __NA: true }, "", "/services/detail?id=one");
  n.back(b.router, "/services");
  b.advance(3000);
  n.back(b.router, "/");
  assert.deepEqual(b.calls, ["back"]);
  b.commit(n);
  n.back(b.router, "/");
  assert.deepEqual(b.calls, ["back", "replace:/"]);
  n.dispose();
});

test("a stale source commit and a URL pop cannot unlock a slow destination", () => {
  const b = browser("/services"),
    n = createAppNavigation(b.env);
  b.history.pushState({ __NA: true }, "", "/services/detail?id=one");
  const calls: string[] = [];
  const slow = {
    back() {
      calls.push("back");
    },
    replace(href: string) {
      calls.push(`replace:${href}`);
    },
  };
  n.back(slow, "/services");
  n.commit("/services/detail", "id=one");
  b.advance(600);
  n.back(slow, "/");
  assert.deepEqual(calls, ["back"]);
  b.traverse(-1);
  b.advance(600);
  n.back(slow, "/");
  assert.deepEqual(
    calls,
    ["back"],
    "URL change is earlier than React destination commit",
  );
  b.commit(n);
  n.back(slow, "/");
  assert.deepEqual(calls, ["back", "replace:/"]);
  n.dispose();
});

test("a new forward intent supersedes a pending Back", () => {
  const b = browser("/services"),
    n = createAppNavigation(b.env);
  b.history.pushState({ __NA: true }, "", "/services/detail?id=one");
  const slow = { back() {}, replace() {} };
  n.back(slow, "/services");
  b.history.pushState({ __NA: true }, "", "/calendars");
  b.commit(n);
  n.back(b.router, "/");
  assert.deepEqual(b.calls, ["back"]);
  assert.equal(b.href(), "/services/detail?id=one");
  n.dispose();
});

test("navigation observations strip query data and cannot disrupt a Back", () => {
  const b = browser("/services?private=first");
  const events: { from: string; to: string | null }[] = [];
  b.env.observe = (event) => {
    events.push(event);
    throw new Error("observer unavailable");
  };
  const n = createAppNavigation(b.env);
  b.history.pushState(
    { __NA: true },
    "",
    "/services/detail?id=one&token=private",
  );
  n.back(b.router, "/services");
  assert.deepEqual(b.calls, ["back"]);
  assert.ok(events.length > 0);
  assert.ok(
    events.every(
      (event) => !event.from.includes("?") && !event.to?.includes("?"),
    ),
  );
  n.dispose();
});
test("after one nested sheet settles, Back can dismiss its parent without a route commit", () => {
  const b = browser("/services"),
    n = createAppNavigation(b.env);
  b.overlay(true);
  b.history.pushState(
    { __NA: true, __gym4meOverlaysV1: ["outer"] },
    "",
    b.env.href(),
  );
  b.history.pushState(
    { __NA: true, __gym4meOverlaysV1: ["outer", "inner"] },
    "",
    b.env.href(),
  );
  n.back(b.router, "/");
  b.traverse(-1);
  b.overlay(true);
  b.advance();
  n.back(b.router, "/");
  assert.equal(b.dismissed(), 2);
  assert.deepEqual(b.calls, []);
  n.dispose();
});

test("login/payment intermediates, foreign metadata and unsafe fallbacks are rejected", () => {
  for (const previous of [
    "/login",
    "/auth/login?returnTo=%2Fmessages",
    "/auth/otp?returnTo=%2Fmessages",
    "/checkout/mock-gateway?order=one",
    "/checkout/status?order=one",
  ]) {
    const b = browser(previous),
      n = createAppNavigation(b.env);
    b.history.pushState({ __NA: true }, "", "/orders/detail?id=one");
    n.back(b.router, "/orders");
    assert.deepEqual(b.calls, ["replace:/orders"]);
    n.dispose();
  }
  const b = browser(),
    n = createAppNavigation(b.env);
  for (const bad of [
    "//evil.test",
    "/\\evil.test",
    "https://evil.test",
    "/invitations/sports",
  ]) {
    assert.equal(n.back(b.router, bad), false);
  }
  assert.deepEqual(b.calls, []);
  n.dispose();
  b.history.replaceState(
    {
      __gym4meNavigationV1: {
        scope: "different-tab",
        id: "old",
        href: "/invitations/sports",
        parentId: "external",
        parentHref: "//evil.test",
      },
    },
    "",
    b.env.href(),
  );
  const fresh = createAppNavigation(b.env);
  assert.equal(fresh.canGoBack(), false);
  fresh.dispose();
});
test("query-only and native trailing-slash entries work with Back, Forward and replacement", () => {
  const b = browser("/services/", "capacitor://localhost"),
    n = createAppNavigation(b.env);
  b.history.pushState({ __NA: true }, "", "/services/detail/?id=one");
  b.history.replaceState(
    { __NA: true },
    "",
    "/services/detail/?id=one&branch=north",
  );
  b.history.pushState({ __NA: true }, "", "/services/detail/?id=two");
  n.back(b.router, "/services");
  assert.equal(b.href(), "/services/detail/?id=one&branch=north");
  b.commit(n);
  b.advance();
  b.traverse(1);
  assert.equal(n.canGoBack(), true);
  n.back(b.router, "/services");
  assert.equal(b.href(), "/services/detail/?id=one&branch=north");
  n.dispose();
});
test("disposing does not clobber a newer framework wrapper or change non-object states", () => {
  const b = browser(),
    original = b.history.pushState,
    n = createAppNavigation(b.env);
  const wrapped = b.history.pushState;
  const framework: History["pushState"] = (data, unused, url) =>
    wrapped.call(b.history, data, unused, url);
  b.history.pushState = framework;
  n.dispose();
  assert.equal(b.history.pushState, framework);
  b.history.pushState({ external: true }, "", "/services");
  assert.deepEqual(b.history.state, { external: true });
  b.history.pushState(new Date(0), "", "/calendars");
  assert.ok(b.history.state instanceof Date);
  b.history.pushState = original;
  const second = createAppNavigation(b.env);
  assert.ok(b.history.state instanceof Date);
  second.dispose();
});
test("a parent fallback retires the duplicate predecessor left by an authentication return", () => {
  const b = browser("/calendars"),
    n = createAppNavigation(b.env);
  b.history.pushState({ __NA: true }, "", "/calendars/detail?id=one");
  b.history.pushState({ __NA: true }, "", "/login?returnTo=calendar");
  b.history.replaceState({ __NA: true }, "", "/calendars/detail?id=one");
  n.back(b.router, "/calendars");
  b.commit(n);
  b.advance();
  assert.equal(b.href(), "/calendars");
  assert.equal(n.canGoBack(), false);
  n.back(b.router, "/");
  assert.equal(b.href(), "/");
  assert.deepEqual(b.calls, ["replace:/calendars", "replace:/"]);
  n.dispose();
});
