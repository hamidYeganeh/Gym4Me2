import { z } from 'zod';
import { commandKey, revision } from './commerce.contracts';
import { normalizeDigits, phoneSchema } from '../auth/auth.contracts';
export const invitationCreateSchema = z
  .object({ serviceId: z.uuid(), userId: z.uuid(), idempotencyKey: commandKey })
  .strict();
export const invitationAnswerSchema = z
  .object({ accept: z.boolean(), revision, idempotencyKey: commandKey })
  .strict();
export const invitationCancelSchema = z
  .object({ revision, idempotencyKey: commandKey })
  .strict();
export const invitationPageSchema = z
  .object({ cursor: z.uuid().optional() })
  .strict();
export const invitationRecipientSchema = z
  .object({
    search: z
      .string()
      .trim()
      .max(100)
      .default('')
      .transform((value) => {
        const phone = phoneSchema.safeParse(value);
        return phone.success ? phone.data : normalizeDigits(value);
      }),
  })
  .strict();
