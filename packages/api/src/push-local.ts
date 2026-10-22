/** Only a non-secret device binding is cached, never account or message data. */
export const PUSH_SCOPE = "/notifications/";
export const PUSH_CACHE = "gym4me-push-device-v1";
export async function pushWorkerMessage(
  registration: ServiceWorkerRegistration,
  message: { type: "status" | "clear" | "bind"; bindingId?: string },
): Promise<string | null> {
  const active = registration.active;
  if (!active) throw new Error("Push worker is not active");
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = setTimeout(() => {
      channel.port1.close();
      reject(new Error("Push worker timed out"));
    }, 4000);
    channel.port1.onmessage = (
      event: MessageEvent<{ bindingId?: string; error?: boolean }>,
    ) => {
      clearTimeout(timeout);
      channel.port1.close();
      if (event.data?.error) reject(new Error("Push worker storage failed"));
      else resolve(event.data?.bindingId ?? null);
    };
    active.postMessage(message, [channel.port2]);
  });
}
export async function clearPushLocal() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator))
    return;
  const registration =
    await navigator.serviceWorker.getRegistration(PUSH_SCOPE);
  if (
    !registration ||
    registration.scope !== new URL(PUSH_SCOPE, location.origin).href
  )
    return;
  try {
    await pushWorkerMessage(registration, { type: "clear" });
  } finally {
    if ("caches" in globalThis) await caches.delete(PUSH_CACHE);
    (await registration.getNotifications()).forEach((notification) =>
      notification.close(),
    );
    await (await registration.pushManager?.getSubscription())?.unsubscribe();
  }
}
