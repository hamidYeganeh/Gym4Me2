"use client";

import { useEffect, useState } from "react";

export function useRetryAfter(action: string) {
  const [deadlines, setDeadlines] = useState<Record<string, number>>({});
  const [now, setNow] = useState(0);
  const remaining = Math.max(0, Math.ceil(((deadlines[action] ?? 0) - now) / 1000));

  useEffect(() => {
    if (!remaining) return;
    const timer = window.setTimeout(() => setNow(Date.now()), 1000);
    return () => window.clearTimeout(timer);
  }, [remaining, now]);

  function capture(response: Response) {
    if (response.status !== 429) return false;
    const header = response.headers.get("Retry-After");
    const parsed = header && /^\d+$/.test(header) ? Number(header) : 0;
    const seconds = Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 60;
    defer(seconds);
    return true;
  }

  function defer(seconds: number) {
    const startedAt = Date.now();
    setNow(startedAt);
    setDeadlines((current) => ({ ...current, [action]: startedAt + seconds * 1000 }));
  }

  function clear(key: string) {
    setDeadlines((current) => ({ ...current, [key]: 0 }));
    setNow(Date.now());
  }

  return { remaining, capture, clear, defer };
}
