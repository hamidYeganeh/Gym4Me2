import { z } from 'zod';
import {
  money,
  commandKey,
  serviceSchema,
} from '../commerce/commerce.contracts';
const words = z.array(z.string().trim().min(1).max(80)).max(12);
export const practiceSchema = z
  .object({
    specialties: words,
    goals: words,
    city: z.string().trim().max(100),
    experienceYears: z.number().int().min(0).max(80),
    published: z.boolean(),
    bufferMinutes: z.number().int().min(0).max(120),
    travelMinutes: z.number().int().min(0).max(240),
    revision: z.number().int().positive(),
  })
  .strict();
export const credentialSchema = z
  .object({
    title: z.string().trim().min(2).max(160),
    issuer: z.string().trim().min(2).max(160),
    expiresAt: z.iso.datetime(),
  })
  .strict();
export const reviewPracticeSchema = z
  .object({
    approved: z.boolean(),
    reason: z.string().trim().min(3).max(1000),
    expiresAt: z.iso.datetime(),
    revision: z.number().int().positive(),
  })
  .strict();
export const availabilitySchema = z
  .object({
    kind: z.enum(['available', 'blocked']),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
  })
  .strict()
  .refine(
    (v) =>
      Date.parse(v.endsAt) > Date.parse(v.startsAt) &&
      Date.parse(v.endsAt) - Date.parse(v.startsAt) <= 31 * 86400000,
  );
export const assessmentSchema = z
  .object({
    goals: z.string().trim().max(2000),
    level: z.string().trim().max(100),
    equipment: z.string().trim().max(1000),
    limitations: z.string().trim().max(2000),
    shared: z.boolean(),
    revision: z.number().int().min(0),
  })
  .strict();
export const noteSchema = z
  .object({
    note: z.string().trim().max(4000),
    followUp: z.string().trim().max(2000),
    shared: z.boolean(),
    revision: z.number().int().min(0),
  })
  .strict();
export const contractSchema = z
  .object({
    organizationId: z.uuid(),
    branchId: z.uuid(),
    coachId: z.uuid(),
    startsOn: z.iso.date(),
    endsOn: z.iso.date().nullable(),
    shareBasisPoints: z.number().int().min(0).max(10000),
    basis: z.enum(['gross', 'net']),
    costsMinor: money,
    terms: z.string().trim().min(10).max(5000),
  })
  .strict()
  .refine((v) => !v.endsOn || v.endsOn >= v.startsOn);
export const ledgerSchema = z
  .object({
    contractId: z.uuid(),
    kind: z.enum(['income', 'payment', 'adjustment']),
    amountMinor: z.string().regex(/^-?[1-9]\d{0,13}$/),
    reservationId: z.uuid().nullable(),
    reference: z.string().trim().min(3).max(1000),
    confirmed: z.boolean(),
    idempotencyKey: commandKey,
  })
  .strict()
  .refine((v) => v.kind === 'adjustment' || BigInt(v.amountMinor) > 0n);
export const coachReviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    body: z.string().trim().min(5).max(2000),
    published: z.boolean(),
    example: z.string().trim().max(2000),
    exampleConsent: z.boolean(),
    revision: z.number().int().min(0),
  })
  .strict();
export const coachingServiceSchema = z
  .object({
    serviceId: z.uuid(),
    mode: z.enum(['private', 'semi_private', 'online', 'introduction']),
    entryAmountMinor: money,
  })
  .strict();
export const coachSearchSchema = z
  .object({
    search: z.string().trim().max(120).default(''),
    city: z.string().trim().max(100).default(''),
    specialty: z.string().trim().max(80).default(''),
    goal: z.string().trim().max(80).default(''),
    maxPrice: money.optional(),
    page: z.coerce.number().int().min(1).max(10000).default(1),
  })
  .strict();

export const offeringSchema = z
  .object({
    service: serviceSchema,
    mode: z.enum(['private', 'semi_private', 'online', 'introduction']),
    entryAmountMinor: money,
    idempotencyKey: commandKey,
  })
  .strict();

export const reviewReplySchema = z
  .object({
    body: z.string().trim().min(3).max(3000),
    revision: z.number().int().min(0),
  })
  .strict();
export const reviewReportSchema = z
  .object({ reason: z.string().trim().min(3).max(1000) })
  .strict();
export const reviewResolutionSchema = z
  .object({
    hidden: z.boolean(),
    reason: z.string().trim().min(3).max(1000),
    revision: z.number().int().positive(),
  })
  .strict();
