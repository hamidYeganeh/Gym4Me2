import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const device = "a1000000-0000-4000-8000-000000000001",
  notice = "a1000000-0000-4000-8000-000000000002";
async function harness() {
  const handlers = new Map<string, (event: unknown) => void>(),
    storage = new Map<string, Response>();
  const shown: {
      title: string;
      options: { body: string; data: unknown; tag: string };
    }[] = [],
    opened: string[] = [];
  let closed = 0;
  const self = {
    location: { origin: "https://app.example" },
    addEventListener: (type: string, handler: (event: unknown) => void) =>
      handlers.set(type, handler),
    skipWaiting: () => Promise.resolve(),
    registration: {
      showNotification: async (
        title: string,
        options: (typeof shown)[number]["options"],
      ) => {
        shown.push({ title, options });
      },
      getNotifications: async () =>
        shown.map(() => ({
          close: () => {
            closed++;
          },
        })),
    },
    clients: {
      claim: () => Promise.resolve(),
      matchAll: async () => [],
      openWindow: async (url: string) => {
        opened.push(url);
      },
    },
  };
  runInNewContext(
    await readFile(new URL("../public/push-sw.js", import.meta.url), "utf8"),
    {
      self,
      URL,
      Response,
      caches: {
        open: async () => ({
          put: async (key: string, value: Response) => {
            storage.set(key, value);
          },
          match: async (key: string) => storage.get(key)?.clone(),
        }),
        delete: async () => {
          storage.clear();
          return true;
        },
      },
    },
  );
  async function dispatch(type: string, props: Record<string, unknown>) {
    const promises: Promise<unknown>[] = [];
    handlers.get(type)?.({
      ...props,
      waitUntil: (promise: Promise<unknown>) => promises.push(promise),
    });
    await Promise.all(promises);
  }
  const bind = (bindingId: string) =>
    dispatch("message", { data: { type: "bind", bindingId }, ports: [] });
  const push = (payload: unknown) =>
    dispatch("push", { data: { json: () => payload } });
  return { shown, opened, bind, push, dispatch, closed: () => closed };
}
test("background push displays only a generic localized notification for the current device", async () => {
  const h = await harness();
  await h.bind(device);
  await h.push({
    version: 1,
    bindingId: device,
    notificationId: notice,
    locale: "fa",
    title: "PRIVATE",
    body: "PRIVATE",
    href: "https://evil.example",
  });
  assert.equal(h.shown.length, 1);
  assert.equal(h.shown[0].title, "Gym4Me");
  assert.ok(!JSON.stringify(h.shown).includes("PRIVATE"));
  assert.match(h.shown[0].options.body, /اعلان/);
  assert.equal(h.shown[0].options.tag, "gym4me-" + notice);
});
test("wrong-account, malformed and post-logout pushes never show or navigate", async () => {
  const h = await harness();
  await h.bind(device);
  await h.push({ version: 1, bindingId: notice, notificationId: notice });
  await h.push({
    version: 1,
    bindingId: device,
    notificationId: "../../private",
  });
  assert.equal(h.shown.length, 0);
  await h.push({ version: 1, bindingId: device, notificationId: notice });
  await h.dispatch("message", { data: { type: "clear" }, ports: [] });
  assert.equal(h.closed(), 1);
  await h.push({ version: 1, bindingId: device, notificationId: notice });
  assert.equal(h.shown.length, 1);
  await h.dispatch("notificationclick", {
    notification: {
      data: { bindingId: device, notificationId: notice },
      close: () => undefined,
    },
  });
  assert.equal(h.opened.length, 0);
});
test("notification click navigates only to the fixed authorized notifications destination", async () => {
  const h = await harness();
  await h.bind(device);
  await h.dispatch("notificationclick", {
    notification: {
      data: {
        bindingId: device,
        notificationId: notice,
        href: "https://evil.example",
      },
      close: () => undefined,
    },
  });
  assert.deepEqual(h.opened, [
    "https://app.example/notifications#notification-" + notice,
  ]);
});
