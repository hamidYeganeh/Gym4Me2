import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  unlinkSync,
} from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
export function enqueueAlert(directory, event) {
  if (!["incident", "recovered"].includes(event.type)) return;
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  writeFileSync(
    resolve(directory, `${Date.now()}-${randomUUID()}.json`),
    JSON.stringify({
      ...event,
      eventId: randomUUID(),
      attempts: 0,
      retryAt: 0,
    }),
    { mode: 0o600, flag: "wx" },
  );
}
export async function deliverAlerts(
  directory,
  endpoint,
  token,
  send = fetch,
  now = Date.now(),
) {
  if (!endpoint) return { configured: false };
  const url = new URL(endpoint);
  if (url.protocol !== "https:" || url.username || url.password)
    throw new Error(
      "Alerts require an HTTPS endpoint without URL credentials.",
    );
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  let delivered = 0;
  for (const name of readdirSync(directory)
    .filter((name) => /^\d+-[a-f0-9-]+\.json$/.test(name))
    .sort()
    .slice(0, 20)) {
    const file = resolve(directory, name);
    const event = JSON.parse(readFileSync(file, "utf8"));
    if (event.retryAt > now) continue;
    try {
      const response = await send(url, {
        method: "POST",
        redirect: "error",
        headers: {
          "content-type": "application/json",
          "idempotency-key": event.eventId,
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          eventId: event.eventId,
          service: event.service,
          type: event.type,
          at: event.at,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error("Rejected");
      await response.body?.cancel();
      unlinkSync(file);
      delivered++;
    } catch {
      event.attempts++;
      event.retryAt =
        now + Math.min(3600000, 30000 * 2 ** Math.min(event.attempts - 1, 7));
      writeFileSync(file, JSON.stringify(event), { mode: 0o600 });
    }
  }
  return { configured: true, delivered };
}
