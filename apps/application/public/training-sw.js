/* Public training shells/static assets only. Never cache an API response or private media. */
// Bump with training client changes: offline reload must use the reviewed bundle.
const CACHE = "gym4me-training-shell-v6";
const shells = [
  "/training",
  "/training/plan",
  "/training/workout",
  "/training/conversation",
];
const asset = (path) =>
  path.startsWith("/_next/static/") || path.startsWith("/images/exercises/") || path === "/images/clubs/training.webp";
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      for (const path of shells) {
        const response = await fetch(path, { cache: "reload" });
        if (response.ok) await cache.put(path, response);
      }
      await self.skipWaiting();
    })(),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith("gym4me-training-shell-") && key !== CACHE)
          await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("message", (event) => {
  if (
    event.data?.type !== "cache-training-assets" ||
    !Array.isArray(event.data.paths)
  )
    return;
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      for (const value of event.data.paths.slice(0, 150)) {
        try {
          const url = new URL(value, self.location.origin);
          if (
            url.origin !== self.location.origin ||
            !asset(url.pathname) ||
            (await cache.match(url.href))
          )
            continue;
          const response = await fetch(url.href);
          if (response.ok) await cache.put(url.href, response);
        } catch {}
      }
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (asset(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE),
          cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      })(),
    );
  } else if (
    request.mode === "navigate" &&
    shells.includes(url.pathname.replace(/\/$/, ""))
  ) {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cached = await (
            await caches.open(CACHE)
          ).match(url.pathname.replace(/\/$/, ""));
          return cached ?? Response.error();
        }
      })(),
    );
  }
});
