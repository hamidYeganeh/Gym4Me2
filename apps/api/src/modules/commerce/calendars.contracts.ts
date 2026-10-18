import { z } from 'zod';
import { commandKey } from './commerce.contracts';

export const calendarPageSchema = z
  .object({
    cursor: z.uuid().optional(),
    search: z.string().trim().max(100).default(''),
    limit: z.coerce.number().int().min(1).max(25).default(20),
  })
  .strict();
export const calendarScopeSchema = z
  .object({ organizationId: z.uuid(), branchId: z.uuid() })
  .strict();
export const calendarSettingsSchema = z
  .object({
    title: z.string().trim().min(2).max(160),
    description: z.string().trim().max(2000).default(''),
    revision: z.number().int().min(0),
    idempotencyKey: commandKey,
  })
  .strict();
export const calendarFollowSchema = z
  .object({ following: z.boolean() })
  .strict();
export type CalendarPageInput = z.infer<typeof calendarPageSchema>;
export type CalendarScope = z.infer<typeof calendarScopeSchema>;
export type CalendarSettingsInput = z.infer<typeof calendarSettingsSchema>;
