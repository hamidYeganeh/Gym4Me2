import {
  recommend,
  type AdaptiveExercise,
  type AdaptiveHistory,
} from './adaptive.policy';
import { preferences, type Preferences } from './adaptive.contracts';
const now = new Date('2026-10-24T12:00:00Z');
const settings: Preferences = {
  goal: 'hypertrophy',
  experience: 'beginner',
  minutes: 30,
  equipment: ['bodyweight', 'dumbbell', 'mat'],
  avoidMuscles: [],
  excludeExercises: [],
};
const library: AdaptiveExercise[] = [
  { id: 'squat', equipment: 'bodyweight', tags: ['legs'] },
  { id: 'row', equipment: 'dumbbell', tags: ['back'] },
  { id: 'plank', equipment: 'mat', tags: ['core'] },
];
function session(
  id: string,
  hours: number,
  rpe: number | null = 6,
): AdaptiveHistory {
  return {
    id,
    startedAt: new Date(+now - (hours + 1) * 3600000),
    endedAt: new Date(+now - hours * 3600000),
    logs: [1, 2].map(() => ({
      exerciseId: 'row',
      done: true,
      reps: 10,
      seconds: null,
      load: 20,
      rpe,
    })),
  };
}
describe('adaptive workout rules', () => {
  it('honours equipment and explicit exclusions as hard constraints', () => {
    const r = recommend(
      { ...settings, equipment: ['bodyweight'], avoidMuscles: ['legs'] },
      library,
      [],
      now,
    );
    expect(r.status).toBe('noExercises');
    expect(
      recommend(
        { ...settings, excludeExercises: ['row'] },
        library,
        [],
        now,
      ).movements.map((x) => x.exerciseId),
    ).not.toContain('row');
  });
  it('never guesses a first load and respects the time budget', () => {
    const r = recommend({ ...settings, minutes: 15 }, library, [], now);
    expect(
      r.movements.every((x) => x.load === null && x.reason === 'firstSession'),
    ).toBe(true);
    expect(r.estimatedMinutes).toBeLessThanOrEqual(15);
  });
  it('skips muscle groups logged within 24 hours instead of inventing recovery percentages', () => {
    const r = recommend(settings, library, [session('recent', 3)], now);
    expect(r.movements.map((x) => x.exerciseId)).not.toContain('row');
    expect(r.recentlyTrained).toEqual(['back']);
    expect(
      recommend(settings, [library[1]], [session('recent', 3)], now).status,
    ).toBe('rest');
  });
  it('requires two completed, sufficiently logged low effort sessions to increase load', () => {
    const one = recommend(
      settings,
      library,
      [session('one', 48)],
      now,
    ).movements.find((x) => x.exerciseId === 'row')!;
    expect(one.load).toBe(20);
    expect(one.reason).toBe('maintain');
    const two = recommend(
      settings,
      library,
      [session('one', 48), session('two', 96)],
      now,
    ).movements.find((x) => x.exerciseId === 'row')!;
    expect(two.load).toBe(20.5);
    expect(two.reason).toBe('progress');
    expect(
      recommend(
        settings,
        library,
        [session('one', 48, null), session('two', 96)],
        now,
      ).movements.find((x) => x.exerciseId === 'row')!.reason,
    ).toBe('maintain');
  });
  it('reduces the next workload after high effort and ignores future or stale history', () => {
    const m = recommend(
      settings,
      library,
      [session('one', 48, 9)],
      now,
    ).movements.find((x) => x.exerciseId === 'row')!;
    expect(m.load).toBe(18);
    expect(m.sets).toBe(1);
    expect(m.reason).toBe('reduce');
    expect(
      recommend(
        settings,
        library,
        [session('future', -10), session('stale', 2400)],
        now,
      ).historySessions,
    ).toBe(0);
  });
  it('rejects malformed preferences at the API boundary', () => {
    expect(preferences.safeParse({ ...settings, equipment: [] }).success).toBe(
      false,
    );
    expect(
      preferences.safeParse({ ...settings, equipment: ['barbell'] }).success,
    ).toBe(false);
    expect(preferences.safeParse({ ...settings, minutes: 0 }).success).toBe(
      false,
    );
  });
});
