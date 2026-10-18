import { z } from 'zod';

const cursor = z.uuid().optional();
export const conversationPageSchema = z
  .object({
    cursor,
    archived: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
  })
  .strict();
export const hostConversationPageSchema = conversationPageSchema.extend({
  organizationId: z.uuid(),
  branchId: z.uuid(),
});
export const notificationPageSchema = z
  .object({
    cursor,
    view: z.enum(['all', 'unread']).default('all'),
  })
  .strict();
export type ConversationPageInput = z.infer<typeof conversationPageSchema>;
export type HostConversationPageInput = z.infer<
  typeof hostConversationPageSchema
>;
export type NotificationPageInput = z.infer<typeof notificationPageSchema>;
