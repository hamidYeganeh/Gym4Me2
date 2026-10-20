import assert from "node:assert/strict";
import test from "node:test";
import { restoreDialogFocus } from "../../../packages/ui/src/lib/dialog-focus";

function withDocument(check: (port: ReturnType<typeof createPort>) => void) {
  const port = createPort();
  const saved = ["document", "window"].map(
    (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
  );
  Object.defineProperties(globalThis, {
    document: { configurable: true, value: port.document },
    window: { configurable: true, value: { location: port.location } },
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
  const focusCalls: Array<{ target: HTMLElement; options?: FocusOptions }> = [];
  const dialogs: HTMLElement[] = [];
  const body = {} as Element;
  const document = {
    body,
    activeElement: body,
    querySelectorAll: () => dialogs,
  };
  const location = { pathname: "/taxonomies", search: "?q=one", hash: "" };
  function element({
    connected = true,
    hidden = false,
    disabled = false,
    ariaDisabled = false,
    children = [] as Element[],
  } = {}) {
    const target = {
      isConnected: connected,
      closest: () => (hidden ? {} : null),
      getClientRects: () => [{}],
      contains: (node: Element) => children.includes(node),
      matches: (selector: string) =>
        (disabled && selector.includes(":disabled")) ||
        (ariaDisabled && selector.includes('[aria-disabled="true"]')),
      focus: (options?: FocusOptions) => {
        document.activeElement = target as unknown as Element;
        focusCalls.push({ target: target as unknown as HTMLElement, options });
      },
    };
    return target as unknown as HTMLElement;
  }
  const origin = element();
  const action = {
    origin,
    target: () => origin,
    location: "/taxonomies?q=one",
  };
  return { document, location, dialogs, element, origin, action, focusCalls };
}

test("a triggerless modal repairs body focus without scrolling the opener", () =>
  withDocument((port) => {
    assert.equal(restoreDialogFocus(port.action), true);
    assert.deepEqual(port.focusCalls, [
      { target: port.origin, options: { preventScroll: true } },
    ]);
  }));

test("Radix restoration or a newer live focus takes precedence", () =>
  withDocument((port) => {
    for (const current of [port.origin, port.element()]) {
      port.document.activeElement = current;
      assert.equal(restoreDialogFocus(port.action), false);
    }
    assert.equal(port.focusCalls.length, 0);
  }));

test("a different active modal prevents fallback even while its focus is still body", () =>
  withDocument((port) => {
    port.dialogs.push(port.element());
    assert.equal(restoreDialogFocus(port.action), false);
    assert.equal(port.focusCalls.length, 0);
  }));

test("a closing nested modal can return to an opener in its still-open parent", () =>
  withDocument((port) => {
    port.dialogs.push(port.element({ children: [port.origin] }));
    assert.equal(restoreDialogFocus(port.action), true);
    assert.equal(port.document.activeElement, port.origin);
  }));

test("an inactive modal does not block the active route's opener", () =>
  withDocument((port) => {
    port.dialogs.push(port.element({ hidden: true }));
    assert.equal(restoreDialogFocus(port.action), true);
  }));

test("missing opener or a later path, query or fragment prevents restoration", () =>
  withDocument((port) => {
    assert.equal(restoreDialogFocus(null), false);
    for (const next of [
      { pathname: "/locations", search: "?q=one", hash: "" },
      { pathname: "/taxonomies", search: "?q=two", hash: "" },
      { pathname: "/taxonomies", search: "?q=one", hash: "#next" },
    ]) {
      Object.assign(port.location, next);
      assert.equal(restoreDialogFocus(port.action), false);
    }
    assert.equal(port.focusCalls.length, 0);
  }));

test("removed, hidden, native-disabled and aria-disabled openers cannot regain focus", () =>
  withDocument((port) => {
    for (const origin of [
      port.element({ connected: false }),
      port.element({ hidden: true }),
      port.element({ disabled: true }),
      port.element({ ariaDisabled: true }),
    ]) {
      assert.equal(
        restoreDialogFocus({ ...port.action, origin, target: () => origin }),
        false,
      );
    }
    assert.equal(port.focusCalls.length, 0);
  }));
