import assert from "node:assert/strict";
import test from "node:test";
import { restoreActionFocus } from "../../../packages/ui/src/lib/action-focus";

function withDocument(check: (port: ReturnType<typeof createPort>) => void) {
  const port = createPort();
  const saved = ["document", "window"].map(
    (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
  );
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: port.document,
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { location: port.location },
  });
  try {
    check(port);
  } finally {
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
}

function createPort() {
  let focused: Element | null = null;
  const document = { body: {} as Element, activeElement: {} as Element };
  const location = { pathname: "/invitations", search: "?scope=one", hash: "" };
  function element({
    connected = true,
    hidden = false,
    disabled = false,
  } = {}) {
    const target = {
      isConnected: connected,
      closest: () => (hidden ? {} : null),
      getClientRects: () => [{}],
      matches: () => disabled,
      focus: () => {
        focused = target as unknown as Element;
        document.activeElement = focused;
      },
    };
    return target as unknown as HTMLElement;
  }
  document.body = element();
  document.activeElement = document.body;
  return { document, location, element, focused: () => focused };
}

test("a completed action focuses a committed fallback when the original row was removed", () =>
  withDocument((port) => {
    const origin = port.element({ connected: false });
    const next = port.element();
    const action = {
      origin,
      location: "/invitations?scope=one",
      target: () => next,
    };
    assert.equal(restoreActionFocus(action), true);
    assert.equal(port.focused(), next);
  }));

test("a later user focus, query navigation or fragment navigation prevents restoration", () =>
  withDocument((port) => {
    const origin = port.element();
    const next = port.element();
    const action = {
      origin,
      location: "/invitations?scope=one",
      target: () => next,
    };
    const userChoice = port.element();
    port.document.activeElement = userChoice;
    assert.equal(restoreActionFocus(action), false);
    assert.equal(port.focused(), null);
    port.document.activeElement = port.document.body;
    port.location.search = "?scope=two";
    assert.equal(restoreActionFocus(action), false);
    port.location.search = "?scope=one";
    port.location.hash = "#another-control";
    assert.equal(restoreActionFocus(action), false);
    assert.equal(port.focused(), null);
  }));

test("disabled, hidden or detached destinations cannot receive async focus", () =>
  withDocument((port) => {
    const origin = port.element();
    for (const target of [
      port.element({ disabled: true }),
      port.element({ hidden: true }),
      port.element({ connected: false }),
      null,
    ]) {
      assert.equal(
        restoreActionFocus({
          origin,
          location: "/invitations?scope=one",
          target: () => target,
        }),
        false,
      );
      assert.equal(port.focused(), null);
    }
  }));
