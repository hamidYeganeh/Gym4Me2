import { z } from 'zod';
import { commandKey, revision } from './commerce.contracts';

export const conversationStateSchema = z
  .object({
    closed: z.boolean(),
    revision,
    reason: z.string().trim().min(3).max(1000),
    idempotencyKey: commandKey,
  })
  .strict();
export type ConversationStateInput = z.infer<typeof conversationStateSchema>;

export const conversationPreferencesSchema = z
  .object({
    archived: z.boolean().optional(),
    readMessageId: z.uuid().optional(),
  })
  .strict()
  .refine((v) => v.archived !== undefined || v.readMessageId !== undefined, {
    message: 'Backend.invalidInput',
  });
export type ConversationPreferencesInput = z.infer<
  typeof conversationPreferencesSchema
>;
