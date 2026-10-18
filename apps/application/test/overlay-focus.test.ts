import assert from "node:assert/strict";
import test from "node:test";
import { restoreOverlayFocus } from "../../../packages/ui/src/lib/active-surface";

test("closing a modal restores its trigger after the background is exposed", () => {
  let nextFrame: (() => void) | undefined;
  let visible = false,
    focused = false;
  const body = {
    isConnected: true,
    closest: () => null,
    getClientRects: () => [1],
  };
  const documentPort = { body, activeElement: body as unknown };
  const trigger = {
    isConnected: true,
    closest: () => (visible ? null : {}),
    getClientRects: () => [1],
    focus: () => {
      focused = true;
    },
  };
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const oldFrame = Object.getOwnPropertyDescriptor(
    globalThis,
    "requestAnimationFrame",
  );
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: documentPort,
  });
  Object.defineProperty(globalThis, "requestAnimationFrame", {
    configurable: true,
    value: (callback: () => void) => {
      nextFrame = callback;
    },
  });
  try {
    restoreOverlayFocus(trigger as unknown as HTMLElement);
    assert.equal(focused, false);
    visible = true;
    nextFrame!();
    assert.equal(focused, true);

    focused = false;
    restoreOverlayFocus(trigger as unknown as HTMLElement);
    documentPort.activeElement = {
      isConnected: true,
      closest: () => null,
      getClientRects: () => [1],
    };
    nextFrame!();
    assert.equal(focused, false, "a newer user focus must win");

    documentPort.activeElement = body;
    restoreOverlayFocus(trigger as unknown as HTMLElement);
    visible = false;
    nextFrame!();
    assert.equal(
      focused,
      false,
      "never restore into an outgoing or hidden route",
    );
  } finally {
    if (oldDocument) Object.defineProperty(globalThis, "document", oldDocument);
    else Reflect.deleteProperty(globalThis, "document");
    if (oldFrame)
      Object.defineProperty(globalThis, "requestAnimationFrame", oldFrame);
    else Reflect.deleteProperty(globalThis, "requestAnimationFrame");
  }
});
