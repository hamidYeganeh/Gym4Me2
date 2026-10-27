import type { Preferences } from './adaptive.contracts';

export type AdaptiveExercise = {
  id: string;
  equipment: string;
  tags: string[];
};
export type AdaptiveLog = {
  exerciseId: string;
  done: boolean;
  reps: number | null;
  seconds: number | null;
  load: number | null;
  rpe: number | null;
};
export type AdaptiveHistory = {
  id: string;
  startedAt: Date;
  endedAt: Date;
  logs: AdaptiveLog[];
};
export type RecommendationReason =
  'firstSession' | 'maintain' | 'progress' | 'reduce' | 'recentlyTrained';
export type AdaptiveMovement = {
  exerciseId: string;
  sets: number;
  reps: number | null;
  seconds: number | null;
  load: number | null;
  restSeconds: number;
  reason: RecommendationReason;
  evidenceSessionIds: string[];
};

/** Transparent, conservative rules; no physiological recovery percentage is inferred. */
export function recommend(
  preferences: Preferences,
  library: AdaptiveExercise[],
  history: AdaptiveHistory[],
  now: Date,
) {
  const recent = history
    .filter(
      (s) =>
        s.endedAt <= now &&
        s.startedAt <= s.endedAt &&
        s.endedAt.getTime() >= now.getTime() - 90 * 86400000,
    )
    .sort(
      (a, b) =>
        b.endedAt.getTime() - a.endedAt.getTime() || a.id.localeCompare(b.id),
    );
  const byId = new Map(library.map((e) => [e.id, e]));
  const trained = new Set(
    recent
      .filter((s) => now.getTime() - s.endedAt.getTime() < 24 * 3600000)
      .flatMap((s) =>
        s.logs
          .filter((l) => l.done)
          .flatMap((l) => byId.get(l.exerciseId)?.tags ?? []),
      ),
  );
  const allowed = library.filter(
    (e) =>
      preferences.equipment.includes(
        e.equipment as Preferences['equipment'][number],
      ) &&
      !preferences.excludeExercises.includes(e.id) &&
      !e.tags.some((t) =>
        preferences.avoidMuscles.includes(
          t as Preferences['avoidMuscles'][number],
        ),
      ),
  );
  // Prefer other muscle groups; if everything was trained recently return a rest recommendation.
  const candidates = allowed
    .filter((e) => !e.tags.some((t) => trained.has(t)))
    .sort((a, b) => a.id.localeCompare(b.id));
  const chosen: AdaptiveExercise[] = [],
    covered = new Set<string>();
  const maxExercises = Math.min(
    6,
    Math.max(2, Math.floor(preferences.minutes / 7)),
  );
  for (const e of candidates) {
    if (e.tags.every((t) => covered.has(t))) continue;
    chosen.push(e);
    e.tags.forEach((t) => covered.add(t));
    if (chosen.length === maxExercises) break;
  }
  let budget = preferences.minutes * 60;
  const movements: AdaptiveMovement[] = [];
  for (const e of chosen) {
    const sessions = recent
      .map((s) => ({
        id: s.id,
        logs: s.logs.filter((l) => l.done && l.exerciseId === e.id),
      }))
      .filter((s) => s.logs.length)
      .slice(0, 2);
    const last = sessions[0]?.logs ?? [];
    const timed = ['plank', 'march'].includes(e.id);
    const reps = timed ? null : preferences.goal === 'strength' ? 6 : 10;
    const restSeconds = preferences.goal === 'strength' ? 90 : 60;
    let sets = preferences.experience === 'beginner' ? 2 : 3;
    let load: number | null =
      e.equipment === 'dumbbell' && last.length
        ? Math.min(
            ...last
              .map((l) => l.load)
              .filter(
                (v): v is number => v !== null && Number.isFinite(v) && v >= 0,
              ),
          )
        : null;
    if (load !== null && !Number.isFinite(load)) load = null;
    let reason: RecommendationReason = last.length
      ? 'maintain'
      : 'firstSession';
    if (last.some((l) => l.rpe !== null && l.rpe >= 9)) {
      reason = 'reduce';
      if (load !== null) load = Math.floor(load * 0.9 * 4) / 4;
      sets = Math.max(1, sets - 1);
    } else if (
      load !== null &&
      load > 0 &&
      sessions.length === 2 &&
      sessions.every(
        (s) =>
          s.logs.length >= sets &&
          s.logs.every(
            (l) =>
              l.rpe !== null &&
              l.rpe <= 7 &&
              l.reps !== null &&
              l.reps >= (reps ?? 10) &&
              l.load !== null &&
              l.load >= load!,
          ),
      )
    ) {
      const increased = Math.floor(Math.min(1000, load * 1.025) * 4) / 4;
      if (increased > load) {
        load = increased;
        reason = 'progress';
      }
    }
    const seconds = timed ? 30 : null;
    const setSeconds = (seconds ?? 45) + restSeconds;
    sets = Math.min(sets, Math.floor((budget - 60) / setSeconds));
    if (sets < 1) break;
    budget -= sets * setSeconds + 60;
    movements.push({
      exerciseId: e.id,
      sets,
      reps,
      seconds,
      load,
      restSeconds,
      reason,
      evidenceSessionIds: sessions.map((s) => s.id),
    });
  }
  return {
    movements,
    recentlyTrained: [...trained].sort(),
    estimatedMinutes: Math.ceil((preferences.minutes * 60 - budget) / 60),
    historySessions: recent.length,
    status: movements.length
      ? ('ready' as const)
      : allowed.length
        ? ('rest' as const)
        : ('noExercises' as const),
  };
}
