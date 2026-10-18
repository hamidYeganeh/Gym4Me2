import { z } from 'zod';
import { commandKey, revision } from './commerce.contracts';
export const resourceCreateSchema = z
  .object({
    organizationId: z.uuid(),
    branchId: z.uuid(),
    name: z.string().trim().min(2).max(120),
    unitIds: z.array(z.uuid()).max(20).default([]),
    idempotencyKey: commandKey,
  })
  .strict();
export const resourceSettingsSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    bufferBeforeMinutes: z.number().int().min(0).max(240),
    bufferAfterMinutes: z.number().int().min(0).max(240),
    revision,
    idempotencyKey: commandKey,
    reason: z.string().trim().min(3).max(1000),
  })
  .strict();
export const resourceBlockSchema = z
  .object({
    kind: z.enum(['closure', 'maintenance']),
    startAt: z.iso.datetime({ offset: true }),
    endAt: z.iso.datetime({ offset: true }),
    revision,
    idempotencyKey: commandKey,
    reason: z.string().trim().min(3).max(1000),
  })
  .strict()
  .refine((v) => Date.parse(v.endAt) > Date.parse(v.startAt), {
    path: ['endAt'],
    message: 'Backend.invalidResourcePeriod',
  });
export const resourceBlockCancelSchema = z
  .object({
    revision,
    idempotencyKey: commandKey,
    reason: z.string().trim().min(3).max(1000),
  })
  .strict();
export const resourceCalendarSchema = z
  .object({
    from: z.iso.datetime({ offset: true }),
    to: z.iso.datetime({ offset: true }),
  })
  .strict()
  .refine(
    (v) => {
      const duration = Date.parse(v.to) - Date.parse(v.from);
      return duration > 0 && duration <= 93 * 86400000;
    },
    { path: ['to'], message: 'Backend.invalidResourcePeriod' },
  );
