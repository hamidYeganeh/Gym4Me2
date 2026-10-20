import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  renameSync,
  rmSync,
} from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

function readAlert(file) {
  const event = JSON.parse(readFileSync(file, "utf8"));
  if (
    !event ||
    Array.isArray(event) ||
    typeof event.eventId !== "string" ||
    !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(event.eventId) ||
    typeof event.service !== "string" ||
    !event.service ||
    typeof event.at !== "string" ||
    !event.at ||
    !["incident", "recovered"].includes(event.type) ||
    !Number.isSafeInteger(event.attempts) ||
    event.attempts < 0 ||
    !Number.isSafeInteger(event.retryAt) ||
    event.retryAt < 0
  )
    throw new Error("Invalid queued alert.");
  return event;
}

function saveRetry(file, event) {
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, JSON.stringify(event), {
      mode: 0o600,
      flag: "wx",
    });
    renameSync(temporary, file);
  } finally {
    rmSync(temporary, { force: true });
  }
}

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
  signal,
) {
  if (!endpoint) return { configured: false };
  const url = new URL(endpoint);
  if (url.protocol !== "https:" || url.username || url.password)
    throw new Error(
      "Alerts require an HTTPS endpoint without URL credentials.",
    );
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  let delivered = 0,
    attempted = 0,
    invalid = 0;
  for (const name of readdirSync(directory)
    .filter((name) => /^\d+-[a-f0-9-]+\.json$/.test(name))
    .sort()) {
    if (attempted >= 20 || signal?.aborted) break;
    const file = resolve(directory, name);
    let event;
    try {
      event = readAlert(file);
    } catch {
      // Preserve damaged records for inspection without stopping health probes.
      invalid++;
      continue;
    }
    if (event.retryAt > now) continue;
    attempted++;
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
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(10000)])
          : AbortSignal.timeout(10000),
      });
      await response.body?.cancel();
      if (signal?.aborted) break;
      if (!response.ok) throw new Error("Rejected");
      unlinkSync(file);
      delivered++;
    } catch {
      // Shutdown is not a receiver failure; retain the unacknowledged record.
      if (signal?.aborted) break;
      event.attempts++;
      event.retryAt =
        now + Math.min(3600000, 30000 * 2 ** Math.min(event.attempts - 1, 7));
      saveRetry(file, event);
    }
  }
  return { configured: true, delivered, attempted, invalid };
}
