/* Generic lock-screen notices; never private text, API credentials or media. */
const DEVICE_CACHE = "gym4me-push-device-v1";
const DEVICE_KEY = new URL("/notifications/.push-device", self.location.origin)
  .href;
const uuid = (value) =>
  typeof value === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
let work = Promise.resolve();
function serial(task) {
  const result = work.catch(() => undefined).then(task);
  work = result;
  return result;
}
async function binding() {
  const response = await (await caches.open(DEVICE_CACHE)).match(DEVICE_KEY);
  if (!response) return null;
  const value = await response.text();
  return uuid(value) ? value : null;
}
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
self.addEventListener("message", (event) => {
  if (!["status", "clear", "bind"].includes(event.data?.type)) return;
  event.waitUntil(
    serial(async () => {
      try {
        if (event.data.type === "bind") {
          if (!uuid(event.data.bindingId)) throw new Error("Invalid device");
          await (
            await caches.open(DEVICE_CACHE)
          ).put(DEVICE_KEY, new Response(event.data.bindingId));
        } else if (event.data.type === "clear") {
          await caches.delete(DEVICE_CACHE);
          (await self.registration.getNotifications()).forEach((notice) =>
            notice.close(),
          );
        }
        event.ports[0]?.postMessage({ bindingId: await binding() });
      } catch {
        event.ports[0]?.postMessage({ error: true });
      }
    }),
  );
});
self.addEventListener("push", (event) => {
  event.waitUntil(
    serial(async () => {
      try {
        const data = event.data?.json();
        if (
          data?.version !== 1 ||
          !uuid(data.bindingId) ||
          !uuid(data.notificationId) ||
          (await binding()) !== data.bindingId
        )
          return;
        const english = data.locale === "en";
        await self.registration.showNotification("Gym4Me", {
          body: english
            ? "You have a new notification. Open Gym4Me to view it."
            : "اعلان جدید دارید. برای مشاهده، Gym4Me را باز کنید.",
          lang: english ? "en" : "fa",
          dir: english ? "ltr" : "rtl",
          tag: `gym4me-${data.notificationId}`,
          data: {
            bindingId: data.bindingId,
            notificationId: data.notificationId,
          },
        });
      } catch {
        /* Invalid or obsolete payloads reveal no account data. */
      }
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    serial(async () => {
      const data = event.notification.data;
      if (
        !uuid(data?.notificationId) ||
        !uuid(data?.bindingId) ||
        (await binding()) !== data.bindingId
      )
        return;
      const href = new URL(
        `/notifications#notification-${data.notificationId}`,
        self.location.origin,
      ).href;
      const tabs = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const existing = tabs.find(
        (tab) => new URL(tab.url).origin === self.location.origin,
      );
      if (existing) {
        await existing.navigate(href);
        await existing.focus();
      } else await self.clients.openWindow(href);
    }),
  );
});
