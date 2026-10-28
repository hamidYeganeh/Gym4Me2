"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "@repo/i18n";
import { DynamicIsland } from "../kit/DynamicIsland";
import { Button } from "../kit/Button";
import { clockSeconds, elapsedAt, initialClock, restoreClock, toggleClock, type WorkoutClock } from "./timer-state";

export function WorkoutTimer({ sessionKey }: { sessionKey: string }) {
  // A different booking must never inherit the previous athlete's clock.
  return <SessionTimer key={sessionKey} sessionKey={sessionKey} />;
}
function SessionTimer({ sessionKey }: { sessionKey: string }) {
  const t = useTranslations("WorkoutTimer"), locale = useLocale();
  const storageKey = `gym4me:workout-timer:v1:${sessionKey}`;
  const [clock, setClock] = useState<WorkoutClock>(() => initialClock());
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(0);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      const saved = raw ? restoreClock(JSON.parse(raw)) : null;
      if (saved) setClock(saved);
    } catch { /* Storage can be unavailable in private browsing; timing still works. */ }
    setNow(Date.now());
    setReady(true);
  }, [storageKey]);
  useEffect(() => {
    if (!ready) return;
    try { sessionStorage.setItem(storageKey, JSON.stringify(clock)); } catch { /* Keep an in-memory clock. */ }
  }, [clock, ready, storageKey]);
  useEffect(() => {
    if (clock.startedAt === null) return;
    const tick = () => {
      const time = Date.now();
      setNow(time);
      if (clock.duration && clockSeconds(clock, time) === 0)
        setClock({ ...clock, elapsed: clock.duration * 1000, startedAt: null });
    };
    tick();
    const interval = window.setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", tick); };
  }, [clock]);
  if (!ready) return null;
  const finished = clock.duration > 0 && elapsedAt(clock, now) >= clock.duration * 1000;
  const choose = (duration: number) => { setNow(Date.now()); setClock(initialClock(duration)); };
  return (
    <section className="space-y-3" aria-label={t("title")}>
      <h3 className="font-semibold">{t("title")}</h3>
      <DynamicIsland seconds={clockSeconds(clock, now)} running={clock.startedAt !== null && !finished} finished={finished}
        label={t(clock.duration ? "rest" : "elapsed")}
        onToggle={() => { const time = Date.now(); setNow(time); setClock(toggleClock(clock, time)); }}
        onReset={() => choose(clock.duration)} />
      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label={t("mode")}>
        <Button variant={clock.duration === 0 ? "secondary" : "ghost"} size="sm" aria-pressed={clock.duration === 0} disabled={clock.startedAt !== null} onClick={() => choose(0)}>{t("elapsed")}</Button>
        {[30, 60, 90, 120].map((duration) => <Button key={duration} variant={clock.duration === duration ? "secondary" : "ghost"} size="sm"
          aria-pressed={clock.duration === duration} disabled={clock.startedAt !== null} onClick={() => choose(duration)}>
          {t("restDuration", { seconds: duration.toLocaleString(locale) })}
        </Button>)}
      </div>
      <p className="text-center text-xs text-muted-foreground">{t("hint")}</p>
    </section>
  );
}
