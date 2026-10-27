import { z } from 'zod';
import { checkoutSchema, commandKey, money } from './commerce.contracts';
import { phoneSchema } from '../auth/auth.contracts';
import { participantSchema } from './offering';
export const scopeSchema = z
  .object({ organizationId: z.uuid(), branchId: z.uuid() })
  .strict();
export const receptionSaleSchema = z
  .object({
    customer: z
      .object({
        phone: phoneSchema,
        name: z.string().trim().min(2).max(120),
      })
      .strict(),
    purchase: checkoutSchema,
  })
  .strict();
export const receiptSchema = z
  .object({
    orderId: z.uuid(),
    method: z.enum(['cash', 'pos', 'bank_transfer']),
    amountMinor: money.refine((v) => BigInt(v) > 0n),
    reference: z.string().trim().min(3).max(120),
    reason: z.string().trim().max(1000).default(''),
    idempotencyKey: commandKey,
  })
  .strict();
export const receiptDecisionSchema = z
  .object({
    approved: z.boolean(),
    revision: z.number().int().positive(),
    reason: z.string().trim().min(3).max(1000),
    idempotencyKey: commandKey,
  })
  .strict();
export const manualEntrySchema = scopeSchema
  .extend({
    membershipId: z.uuid().optional(),
    reservationId: z.uuid().optional(),
    entryPassId: z.uuid().optional(),
    reason: z.string().trim().min(2).max(500).default('routine'),
    idempotencyKey: commandKey,
  })
  .strict()
  .refine((v) => Boolean(v.membershipId) !== Boolean(v.reservationId));
export const rollcallSchema = z
  .object({
    changes: z
      .array(
        z
          .object({
            reservationId: z.uuid(),
            present: z.boolean(),
            revision: z.number().int().positive(),
          })
          .strict(),
      )
      .min(1)
      .max(200),
    reason: z.string().trim().min(2).max(500).default('rollcall'),
    idempotencyKey: commandKey,
  })
  .strict()
  .refine(
    (v) =>
      new Set(v.changes.map((c) => c.reservationId)).size === v.changes.length,
  );
export const makeupSchema = z
  .object({
    targetOccurrenceId: z.uuid(),
    revision: z.number().int().positive(),
    reason: z.string().trim().min(3).max(1000),
    idempotencyKey: commandKey,
  })
  .strict();
export const programIntakeSchema = z
  .object({
    revision: z.number().int().positive(),
    goals: z.string().trim().min(3).max(2000),
    experience: z.string().trim().max(2000),
    limitations: z.string().trim().max(2000),
    location: z.string().trim().max(500),
    idempotencyKey: commandKey,
  })
  .strict();
export const programUpdateSchema = z
  .object({
    revision: z.number().int().positive(),
    status: z.enum(['preparing', 'delivered']),
    assignmentId: z.uuid().optional(),
    idempotencyKey: commandKey,
  })
  .strict();
export const programRevisionSchema = z
  .object({
    revision: z.number().int().positive(),
    reason: z.string().trim().min(3).max(2000),
    idempotencyKey: commandKey,
  })
  .strict();
export const seriesEnrollmentSchema = z
  .object({
    serviceId: z.uuid(),
    seriesId: z.uuid(),
    membershipId: z.uuid(),
    participants: z.array(participantSchema).max(1).default([]),
    dependentId: z.uuid().optional(),
    idempotencyKey: commandKey,
  })
  .strict();

export const refundSettlementSchema = z
  .object({
    method: z.enum(['cash', 'pos', 'bank_transfer']),
    reference: z.string().trim().min(3).max(120),
    returnedOn: z.iso.date(),
    reason: z.string().trim().min(3).max(1000),
    idempotencyKey: commandKey,
  })
  .strict();

export const coachProgramSchema = z
  .object({
    title: z.string().trim().min(2).max(160),
    sportId: z.uuid(),
    amountMinor: money,
    deliveryDays: z.number().int().min(1).max(90),
    supportDays: z.number().int().min(0).max(365),
    maxRevisions: z.number().int().min(0).max(100).nullable().default(null),
    responseHours: z.number().int().min(1).max(720).nullable().default(null),
    terms: z.string().trim().min(10).max(10000),
    idempotencyKey: commandKey,
  })
  .strict();

export const membershipBenefitsSchema = z
  .object({
    revision: z.number().int().positive(),
    serviceIds: z.array(z.uuid()).max(100),
    entryAllowed: z.boolean(),
    reason: z.string().trim().min(3).max(1000),
    idempotencyKey: commandKey,
  })
  .strict();
