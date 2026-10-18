import { z } from 'zod';

export const money = z.string().regex(/^(0|[1-9]\d{0,13})$/);
export const revision = z.number().int().positive();
export const commandKey = z
  .string()
  .min(8)
  .max(100)
  .regex(/^[\w-]+$/);
export const policySchema = z
  .object({
    cancellationHours: z.number().int().min(0).max(8760),
    lateRefundBasisPoints: z.number().int().min(0).max(10000),
    noShowConsumesSession: z.boolean(),
    consumeOn: z.enum(['attendance', 'confirmation']),
    freezeDays: z.number().int().min(0).max(365),
    depositBasisPoints: z.number().int().min(0).max(10000),
    guestAllowance: z.number().int().min(0).max(100),
    transferable: z.boolean(),
    terms: z.string().trim().min(10).max(10000),
  })
  .strict();
export type ServicePolicy = z.infer<typeof policySchema>;
export const eligibilitySchema = z
  .object({
    minimumAge: z.number().int().min(0).max(120).nullable().default(null),
    maximumAge: z.number().int().min(0).max(120).nullable().default(null),
    prerequisites: z
      .array(
        z
          .object({
            kind: z.enum(['experience', 'equipment', 'preparation']),
            description: z.string().trim().min(1).max(200),
          })
          .strict(),
      )
      .max(12)
      .default([]),
  })
  .strict()
  .refine(
    (value) =>
      value.minimumAge === null ||
      value.maximumAge === null ||
      value.minimumAge <= value.maximumAge,
    { path: ['maximumAge'], message: 'Backend.invalidAgeRange' },
  );
export type ServiceEligibility = z.infer<typeof eligibilitySchema>;
export const serviceSchema = z
  .object({
    organizationId: z.uuid(),
    branchId: z.uuid(),
    title: z.string().trim().min(2).max(160),
    description: z.string().trim().max(10000).default(''),
    kind: z.enum(['class', 'course', 'court', 'access', 'membership']),
    amountMinor: money,
    currency: z.literal('IRR').default('IRR'),
    durationDays: z.number().int().min(1).max(3660).nullable().default(null),
    sessionCount: z.number().int().min(1).max(10000).nullable().default(null),
    policy: policySchema,
    eligibility: eligibilitySchema.default({
      minimumAge: null,
      maximumAge: null,
      prerequisites: [],
    }),
    resourceIds: z.array(z.uuid()).max(20).default([]),
    requirements: z
      .array(z.string().trim().min(1).max(200))
      .max(20)
      .default([]),
    level: z.string().trim().max(80).default(''),
    coachName: z.string().trim().max(120).default(''),
    coachUserId: z.uuid().nullable().default(null),
    visibility: z.enum(['public', 'unlisted']).default('public'),
    approvalRequired: z.boolean().default(false),
    showParticipants: z.boolean().default(false),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.kind === 'membership' && !v.durationDays && !v.sessionCount)
      ctx.addIssue({
        code: 'custom',
        path: ['durationDays'],
        message: 'A membership needs time or usage limits',
      });
    if (v.kind === 'court' && !v.resourceIds.length)
      ctx.addIssue({
        code: 'custom',
        path: ['resourceIds'],
        message: 'A court needs an exclusive resource',
      });
  });
export type ServiceInput = z.infer<typeof serviceSchema>;
export const occurrenceSchema = z
  .object({
    startAt: z.iso.datetime({ offset: true }),
    endAt: z.iso.datetime({ offset: true }),
    capacity: z.number().int().min(1).max(10000),
  })
  .strict()
  .refine((v) => Date.parse(v.endAt) > Date.parse(v.startAt), {
    path: ['endAt'],
  });
export const occurrenceSeriesSchema = occurrenceSchema.safeExtend({
  count: z.number().int().min(1).max(52),
  intervalDays: z.union([z.literal(1), z.literal(7), z.literal(14)]),
  revision,
  idempotencyKey: commandKey,
});
export type OccurrenceSeriesInput = z.infer<typeof occurrenceSeriesSchema>;
export const occurrenceSeriesEditSchema = occurrenceSchema.safeExtend({
  intervalDays: z.union([z.literal(1), z.literal(7), z.literal(14)]),
  revision,
  idempotencyKey: commandKey,
  reason: z.string().trim().min(5).max(500),
});
export type OccurrenceSeriesEditInput = z.infer<
  typeof occurrenceSeriesEditSchema
>;
export const checkoutSchema = z
  .object({
    serviceId: z.uuid(),
    occurrenceId: z.uuid().optional(),
    membershipId: z.uuid().optional(),
    coupon: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,60}$/)
      .optional(),
    quoteId: z.uuid().optional(),
    idempotencyKey: commandKey,
  })
  .strict();
export const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,60}$/),
    basisPoints: z.number().int().min(1).max(10000),
    maxUses: z.number().int().min(1).max(100000),
    expiresAt: z.iso.datetime({ offset: true }),
  })
  .strict()
  .refine((value) => Date.parse(value.expiresAt) > Date.now(), {
    path: ['expiresAt'],
  });
export const changeSchema = z
  .object({
    revision,
    idempotencyKey: commandKey,
    occurrenceId: z.uuid().optional(),
    expectedRefundMinor: money.optional(),
  })
  .strict();
export const paymentScenario = z.enum([
  'success',
  'failure',
  'timeout',
  'late',
]);
export type PaymentScenario = z.infer<typeof paymentScenario>;

/** Keep money out of floating point arithmetic, including discounts and refunds. */
export function basisPoints(amount: string, points: number) {
  return ((BigInt(amount) * BigInt(points)) / 10000n).toString();
}
