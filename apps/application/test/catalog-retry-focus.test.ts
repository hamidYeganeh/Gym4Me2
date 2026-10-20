import assert from "node:assert/strict";
import test from "node:test";
import { restoreCatalogRetryFocus } from "../lib/catalog-retry-focus";

test("missing-page retry restores after replacement, without overriding newer focus or another route", () => {
  let frame: (() => void) | undefined;
  let focused = 0,
    hidden = false;
  const body = {};
  const doc = { body, activeElement: body as object };
  const location = { pathname: "/discovery/clubs/one", search: "?branch=main" };
  const target = {
    isConnected: true,
    closest: () => (hidden ? {} : null),
    getClientRects: () => [1],
    focus: () => {
      focused++;
    },
  };
  const surface = { isConnected: true, querySelectorAll: () => [target] };
  const originals = ["document", "window", "requestAnimationFrame"].map(
    (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
  );
  Object.defineProperties(globalThis, {
    document: { configurable: true, value: doc },
    window: { configurable: true, value: { location } },
    requestAnimationFrame: {
      configurable: true,
      value: (next: () => void) => {
        frame = next;
      },
    },
  });
  const run = () =>
    restoreCatalogRetryFocus(
      surface as unknown as HTMLElement,
      "/discovery/clubs/one?branch=main",
    );
  try {
    run();
    assert.equal(focused, 0);
    frame!();
    assert.equal(focused, 1);
    run();
    doc.activeElement = {};
    frame!();
    assert.equal(focused, 1);
    doc.activeElement = body;
    run();
    hidden = true;
    frame!();
    assert.equal(focused, 1);
    hidden = false;
    run();
    location.pathname = "/discovery/clubs/two";
    frame!();
    assert.equal(focused, 1);
    location.pathname = "/discovery/clubs/one";
    run();
    surface.isConnected = false;
    frame!();
    assert.equal(focused, 1);
  } finally {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
