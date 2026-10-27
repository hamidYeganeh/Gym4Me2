/* Retire the former workout shell without affecting push subscriptions. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith("gym4me-training-")) await caches.delete(key);
      await self.registration.unregister();
    })(),
  );
});
