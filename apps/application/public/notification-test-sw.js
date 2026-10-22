// Local device check only: no subscriptions, private payloads, API or offline cache.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = new URL("/notifications", self.location.origin).href;
  event.waitUntil(
    (async () => {
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
    })(),
  );
});
