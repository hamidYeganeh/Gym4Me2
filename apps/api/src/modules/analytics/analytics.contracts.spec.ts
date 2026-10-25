import { analyticsFilters, analyticsWindow } from './analytics.contracts';
describe('analytics calendar boundaries', () => {
  it('accepts a program sales filter', () =>
    expect(
      analyticsFilters.parse({
        from: '2026-10-01',
        to: '2026-10-25',
        kind: 'program',
      }).kind,
    ).toBe('program'));
  it('includes the whole final Tehran day, with an exclusive end', () => {
    const f = analyticsFilters.parse({ from: '2026-05-01', to: '2026-05-01' });
    expect(analyticsWindow(f)).toEqual({
      start: '2026-05-01T00:00:00+03:30',
      end: '2026-05-01T20:30:00.000Z',
    });
  });
  it.each([
    { from: '2026-02-30', to: '2026-03-01' },
    { from: '2026-03-01', to: '2026-02-01' },
    { from: '2023-01-01', to: '2026-01-01', interval: 'month' },
    { from: '2026-01-01', to: '2026-12-31' },
    { from: '2026-01-01', to: '2026-01-01', organizationId: 'not-a-uuid' },
    {
      from: '2026-01-01',
      to: '2026-01-01',
      interval: "day');drop table users;--",
    },
  ])('rejects invalid and unbounded queries: %j', (q) =>
    expect(analyticsFilters.safeParse(q).success).toBe(false),
  );
  it('accepts multi-year monthly reports', () =>
    expect(
      analyticsFilters.safeParse({
        from: '2025-01-01',
        to: '2026-12-31',
        interval: 'month',
      }).success,
    ).toBe(true));
});
