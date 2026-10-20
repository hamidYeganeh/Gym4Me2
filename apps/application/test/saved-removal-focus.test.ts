import assert from "node:assert/strict";
import test from "node:test";
import { restoreSavedRemovalFocus } from "../lib/saved-removal-focus";

test("saved removal waits for a replacement list, then picks next, previous, retained item or empty action", () => {
  let focused = "",
    busy = false;
  const body = {};
  const documentState = { body, activeElement: body as object };
  const location = { pathname: "/saved", search: "" };
  const element = (id: string) => ({
    isConnected: true,
    dataset: { savedId: id },
    closest: () => null,
    getClientRects: () => [1],
    focus: () => {
      focused = id;
    },
  });
  const removed = element("removed");
  removed.isConnected = false;
  const next = element("next"),
    previous = element("previous");
  const empty = element("empty"),
    fallback = element("fallback");
  let buttons = [previous, next];
  let showEmpty = true;
  const surface = {
    ...element("surface"),
    querySelectorAll: () => buttons,
    querySelector: (selector: string) =>
      selector.includes("aria-busy")
        ? busy
          ? {}
          : null
        : selector.includes("saved-empty")
          ? showEmpty
            ? empty
            : null
          : fallback,
  };
  const originals = ["document", "window"].map(
    (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
  );
  Object.defineProperties(globalThis, {
    document: { configurable: true, value: documentState },
    window: { configurable: true, value: { location } },
  });
  const run = () =>
    restoreSavedRemovalFocus(surface as unknown as HTMLElement, {
      button: removed as unknown as HTMLButtonElement,
      ids: ["next", "previous"],
      path: "/saved",
    });
  try {
    busy = true;
    assert.equal(run(), false);
    assert.equal(focused, "");
    busy = false;
    removed.isConnected = true;
    assert.equal(run(), false);
    removed.isConnected = false;
    assert.equal(run(), true);
    assert.equal(focused, "next");
    buttons = [previous];
    run();
    assert.equal(focused, "previous");
    buttons = [previous, element("removed")];
    run();
    assert.equal(focused, "removed");
    buttons = [];
    run();
    assert.equal(focused, "empty");
    showEmpty = false;
    run();
    assert.equal(focused, "fallback");
    focused = "";
    documentState.activeElement = {};
    run();
    assert.equal(focused, "");
    documentState.activeElement = body;
    location.pathname = "/saved/coaches";
    run();
    assert.equal(focused, "");
    location.pathname = "/saved";
    surface.isConnected = false;
    run();
    assert.equal(focused, "");
  } finally {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
