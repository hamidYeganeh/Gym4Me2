export type WorkoutClock = { elapsed: number; startedAt: number | null; duration: number };
export const initialClock = (duration = 0): WorkoutClock => ({ elapsed: 0, startedAt: null, duration });
// Wall time is the source of truth: background throttling must not slow a workout.
export function elapsedAt(clock: WorkoutClock, now: number) {
  const elapsed = clock.elapsed + (clock.startedAt === null ? 0 : Math.max(0, now - clock.startedAt));
  return clock.duration ? Math.min(elapsed, clock.duration * 1000) : elapsed;
}
export function clockSeconds(clock: WorkoutClock, now: number) {
  const elapsed = elapsedAt(clock, now);
  return clock.duration ? Math.max(0, Math.ceil(clock.duration - elapsed / 1000)) : Math.floor(elapsed / 1000);
}
export function toggleClock(clock: WorkoutClock, now: number): WorkoutClock {
  if (clock.startedAt !== null) return { ...clock, elapsed: elapsedAt(clock, now), startedAt: null };
  const done = clock.duration > 0 && clock.elapsed >= clock.duration * 1000;
  return { ...clock, elapsed: done ? 0 : clock.elapsed, startedAt: now };
}
export function restoreClock(value: unknown): WorkoutClock | null {
  if (!value || typeof value !== 'object') return null;
  const c = value as WorkoutClock;
  return Number.isFinite(c.elapsed) && c.elapsed >= 0 && Number.isFinite(c.duration) && c.duration >= 0 && c.duration <= 3600 && (c.startedAt === null || (Number.isFinite(c.startedAt) && c.startedAt > 0)) ? { elapsed: c.elapsed, duration: c.duration, startedAt: c.startedAt } : null;
}
