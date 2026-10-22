import { z } from 'zod';

export const calendarDate = z.iso.date();
export const analyticsFilters = z
  .object({
    from: calendarDate,
    to: calendarDate,
    interval: z.enum(['day', 'week', 'month']).default('day'),
    organizationId: z.uuid().optional(),
    branchId: z.uuid().optional(),
    serviceId: z.uuid().optional(),
    kind: z
      .enum(['class', 'course', 'court', 'access', 'membership'])
      .optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    const days = (Date.parse(v.to) - Date.parse(v.from)) / 86400000;
    if (days < 0 || days > 730 || (v.interval === 'day' && days > 92))
      ctx.addIssue({
        code: 'custom',
        message: 'Analytics.invalidRange',
        path: ['to'],
      });
  });
export type AnalyticsFilters = z.infer<typeof analyticsFilters>;
export type AnalyticsSurface = 'admin' | 'business' | 'coach';

/** Tehran calendar dates; end is exclusive, including the entire selected last day. */
export function analyticsWindow(input: AnalyticsFilters) {
  const end = new Date(Date.parse(`${input.to}T00:00:00+03:30`) + 86400000);
  return { start: `${input.from}T00:00:00+03:30`, end: end.toISOString() };
}
