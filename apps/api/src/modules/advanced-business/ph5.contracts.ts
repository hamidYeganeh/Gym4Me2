import { z } from 'zod';
import { commandKey, money, revision } from '../commerce/commerce.contracts';
const id = z.uuid();
const date = z.iso.date();
const reason = z.string().trim().min(5).max(2000);
const command = { idempotencyKey: commandKey };
export const scopeSchema = z
  .object({
    organizationId: id,
    branchId: id.optional(),
    from: date.optional(),
    to: date.optional(),
    page: z.coerce.number().int().min(1).max(10000).optional(),
  })
  .strict()
  .refine((v) => !v.from || !v.to || v.from <= v.to);
export const planSchema = z
  .object({
    ...command,
    organizationId: id,
    plan: z.enum(['basic', 'pro']),
    revision,
    catalogRevision: revision,
    outcome: z.enum(['succeeded', 'failed', 'unknown']),
    acceptTerms: z.literal(true),
    months: z.number().int().min(1).max(12),
    reason,
  })
  .strict();
export const catalogSchema = z
  .object({
    ...command,
    code: z.enum(['basic', 'pro']),
    amountMinor: money,
    branchLimit: z.number().int().min(1).max(1000),
    revision,
    reason,
  })
  .strict()
  .refine(
    (v) => v.code !== 'basic' || (v.amountMinor === '0' && v.branchLimit === 1),
    { message: 'PH5.basicFixed' },
  );
export const ruleSchema = z
  .object({
    ...command,
    contractId: id,
    mode: z.enum(['percentage', 'per_session', 'fixed']),
    amountMinor: money,
    discountPayer: z.enum(['shared', 'business']),
    spaceMinor: money,
    platformBps: z.number().int().min(0).max(10000),
    reason,
  })
  .strict();
export const statementSchema = z
  .object({
    ...command,
    organizationId: id,
    branchId: id,
    coachId: id,
    from: date,
    to: date,
  })
  .strict()
  .refine(
    (v) =>
      v.from <= v.to &&
      (Date.parse(v.to) - Date.parse(v.from)) / 86400000 <= 366,
    { message: 'PH5.invalidPeriod' },
  );
export const approveSchema = z
  .object({ ...command, revision, reason })
  .strict();
export const payoutSchema = z
  .object({
    ...command,
    revision,
    reference: z.string().trim().min(5).max(120),
    method: z.enum(['mock', 'manual']),
    outcome: z.enum(['succeeded', 'failed', 'unknown']),
    reason,
  })
  .strict();
export const reconcileSchema = z
  .object({ ...command, outcome: z.enum(['succeeded', 'failed']), reason })
  .strict();
export const disputeSchema = z
  .object({ ...command, earningId: id, reason })
  .strict();
export const resolveSchema = z
  .object({
    ...command,
    revision,
    amountMinor: z.string().regex(/^-?(0|[1-9]\d{0,13})$/),
    reason,
  })
  .strict();
export const branchSchema = z
  .object({
    ...command,
    organizationId: id,
    branchId: id,
    revision: z.number().int().min(0),
    active: z.boolean(),
    acknowledgeFuture: z.literal(true),
    reason,
  })
  .strict();
export const sharedSchema = z
  .object({
    ...command,
    membershipId: id,
    revision,
    services: z.array(id).min(1).max(100),
    allocations: z
      .array(
        z
          .object({
            branchId: id,
            basisPoints: z.number().int().min(0).max(10000),
          })
          .strict(),
      )
      .min(1)
      .max(100),
    reason,
  })
  .strict()
  .refine(
    (v) =>
      new Set(v.services).size === v.services.length &&
      new Set(v.allocations.map((a) => a.branchId)).size ===
        v.allocations.length &&
      v.allocations.reduce((n, a) => n + a.basisPoints, 0) === 10000,
    { message: 'PH5.invalidAllocation' },
  );
export type Scope = z.infer<typeof scopeSchema>;
export const priceSchema = z
  .object({
    ...command,
    organizationId: id,
    branchId: id.optional(),
    kind: z.enum([
      'class',
      'course',
      'court',
      'access',
      'membership',
      'program',
    ]),
    amountMinor: money,
    revision: z.number().int().min(0),
    reason,
  })
  .strict();
