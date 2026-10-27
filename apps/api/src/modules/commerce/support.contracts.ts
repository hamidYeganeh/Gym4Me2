import { z } from 'zod';
import { commandKey } from './commerce.contracts';

export const supportCategory = z.enum([
  'general',
  'booking_issue',
  'entry_denied',
  'provider_absent',
  'payment',
  'refund',
  'program',
]);
export const supportCreateSchema = z
  .object({
    title: z.string().trim().min(3).max(160),
    body: z.string().trim().min(3).max(5000),
    orderId: z.uuid().optional(),
    category: supportCategory.default('general'),
    idempotencyKey: commandKey.optional(),
  })
  .strict()
  .refine((v) => v.category === 'general' || !!v.orderId, {
    message: 'Support.orderRequired',
  });

export const supportReplySchema = z
  .object({
    body: z.string().trim().min(1).max(5000),
    idempotencyKey: commandKey.optional(),
  })
  .strict();

export const supportAdminReplySchema = z
  .object({
    body: z.string().trim().min(1).max(5000),
    resolve: z.boolean(),
    revision: z.number().int().positive().optional(),
    resolution: z
      .enum(['answered', 'correction', 'refund_review', 'provider_contacted'])
      .optional(),
    idempotencyKey: commandKey.optional(),
  })
  .strict();
