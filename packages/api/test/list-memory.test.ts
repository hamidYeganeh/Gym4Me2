import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clearListMemory,
  readListMemory,
  subscribeListMemory,
  writeListMemory,
} from "../src/list-memory";

test("session UI preferences isolate scopes and clear on logout even if storage is blocked", () => {
  const values = new Map<string, string>();
  const events = new EventTarget();
  let blocked = false;
  const storage = {
    get length() {
      return values.size;
    },
    key: (i: number) => [...values.keys()][i] ?? null,
    getItem: (key: string) => {
      if (blocked) throw new Error("blocked");
      return values.get(key) ?? null;
    },
    setItem: (key: string, value: string) => {
      if (blocked) throw new Error("blocked");
      values.set(key, value);
    },
    removeItem: (key: string) => values.delete(key),
  };
  Object.defineProperty(globalThis, "window", {
    value: {
      sessionStorage: storage,
      addEventListener: events.addEventListener.bind(events),
      removeEventListener: events.removeEventListener.bind(events),
      dispatchEvent: events.dispatchEvent.bind(events),
    },
    configurable: true,
  });
  let notifications = 0;
  const unsubscribe = subscribeListMemory(() => notifications++);
  try {
    values.set("unrelated", "keep");
    writeListMemory("athlete:branch-a", "a");
    writeListMemory("athlete:branch-b", "b");
    assert.equal(readListMemory("athlete:branch-a"), "a");
    assert.equal(readListMemory("coach:branch-a"), null);
    assert.equal(notifications, 2);
    clearListMemory();
    assert.equal(readListMemory("athlete:branch-b"), null);
    assert.equal(values.get("unrelated"), "keep");
    writeListMemory("old", "must disappear");
    blocked = true;
    writeListMemory("private", "preference");
    clearListMemory();
    assert.equal(readListMemory("private"), null);
    blocked = false;
    assert.equal(readListMemory("old"), null);
  } finally {
    unsubscribe();
    Reflect.deleteProperty(globalThis, "window");
  }
});
