import { z } from 'zod';
import { commandKey, money } from './commerce.contracts';
export const dependentInput = z
  .object({
    name: z.string().trim().min(2).max(120),
    birthDate: z.iso.date(),
    gender: z.enum(['male', 'female', 'unspecified']),
    guardianAcknowledged: z.literal(true),
    idempotencyKey: commandKey,
  })
  .strict();
export const dependentUpdate = dependentInput
  .extend({
    revision: z.number().int().positive(),
    status: z.enum(['active', 'archived']).default('active'),
  })
  .strict();
export const installmentPlanInput = z
  .object({
    activation: z.enum(['after_first', 'after_full']),
    graceDays: z.number().int().min(0).max(30),
    installments: z
      .array(
        z
          .object({
            dueOn: z.iso.date(),
            amountMinor: money.refine((v) => BigInt(v) > 0n),
          })
          .strict(),
      )
      .min(2)
      .max(24),
    reason: z.string().trim().min(3).max(1000),
    idempotencyKey: commandKey,
  })
  .strict();
export const legacySportInput = z
  .object({
    sportId: z.uuid(),
    revision: z.number().int().positive(),
    reason: z.string().trim().min(3).max(1000),
    idempotencyKey: commandKey,
  })
  .strict();
