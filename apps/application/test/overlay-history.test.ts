import assert from "node:assert/strict";
import test from "node:test";
import {
  createOverlayHistory,
  OVERLAY_HISTORY_KEY,
} from "../../../packages/ui/src/lib/overlay-history";

function browser() {
  let index = 0,
    serial = 0,
    queued = 0;
  const stack = [
    { href: "/services", state: { next: "opaque" } as Record<string, unknown> },
  ];
  const listeners = new Set<() => void>();
  const history = createOverlayHistory({
    state: () => stack[index]!.state,
    href: () => stack[index]!.href,
    id: () => String(++serial),
    push: (state) => {
      stack.splice(index + 1);
      stack.push({ href: stack[index]!.href, state });
      index++;
    },
    replace: (state) => {
      stack[index]!.state = state;
    },
    back: () => {
      queued++;
    },
    listen: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  });
  const pop = (step = -1) => {
    index += step;
    for (const listener of listeners) listener();
  };
  return {
    history,
    pop,
    state: () => stack[index]!.state,
    index: () => index,
    flush: () => {
      while (queued) {
        queued--;
        assert.ok(index > 0, "must never traverse outside overlay history");
        pop();
      }
    },
    route: () => {
      stack.splice(index + 1);
      stack.push({ href: "/bookings", state: { next: "another" } });
      index++;
      for (const listener of listeners) listener();
    },
  };
}
test("browser Back dismisses only the top nested sheet; closing restores the parent", () => {
  const b = browser(),
    calls: string[] = [];
  const outer = b.history.open(() => calls.push("outer"));
  const inner = b.history.open(() => calls.push("inner"));
  assert.equal(b.state().next, "opaque");
  b.pop();
  assert.deepEqual(calls, ["inner"]);
  inner();
  b.flush();
  assert.equal(b.index(), 1);
  b.pop();
  assert.deepEqual(calls, ["inner", "outer"]);
  outer();
  b.flush();
  assert.equal(b.index(), 0);
  b.history.dispose();
});
test("native dismissal and repeated Back do not close the sheet underneath", () => {
  const b = browser(),
    calls: string[] = [];
  const outer = b.history.open(() => calls.push("outer"));
  const inner = b.history.open(() => calls.push("inner"));
  assert.equal(b.history.dismissTop(), true);
  assert.equal(b.history.dismissTop(), true);
  assert.deepEqual(calls, ["inner"]);
  inner();
  b.flush();
  assert.equal(b.index(), 1);
  outer();
  b.flush();
  assert.equal(b.index(), 0);
  b.history.dispose();
});
test("a removed parent drains safely after its child closes", () => {
  const b = browser();
  const outer = b.history.open(() => assert.fail("removed parent"));
  const inner = b.history.open(() => assert.fail("programmatic close"));
  outer();
  inner();
  b.flush();
  assert.equal(b.index(), 0);
  assert.equal(b.state()[OVERLAY_HISTORY_KEY], undefined);
  b.history.dispose();
});
test("closing and immediately reopening waits for the asynchronous pop", () => {
  const b = browser();
  const old = b.history.open(() => assert.fail("closed sheet"));
  old();
  const fresh = b.history.open(() => assert.fail("fresh sheet must stay open"));
  b.flush();
  assert.equal(b.index(), 1);
  assert.deepEqual(b.state()[OVERLAY_HISTORY_KEY], ["2"]);
  fresh();
  b.flush();
  b.history.dispose();
});
test("a route change closes overlays without consuming the destination history", () => {
  const b = browser(),
    calls: string[] = [];
  const close = b.history.open(() => calls.push("closed"));
  b.route();
  close();
  b.flush();
  assert.deepEqual(calls, ["closed"]);
  assert.equal(b.index(), 2);
  assert.equal(b.state().next, "another");
  b.history.dispose();
});
test("Forward into a retired overlay does not reopen or trap history", () => {
  const b = browser();
  const close = b.history.open(() => assert.fail("already closed"));
  close();
  b.flush();
  b.pop(1);
  b.flush();
  assert.equal(b.index(), 1);
  assert.equal(b.state()[OVERLAY_HISTORY_KEY], undefined);
  assert.equal(b.state().next, "opaque");
  b.history.dispose();
});
