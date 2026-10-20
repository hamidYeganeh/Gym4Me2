import { z } from 'zod';
import { phoneSchema } from '../auth/auth.contracts';

export const coachingInviteSchema = z
  .object({
    phone: phoneSchema,
  })
  .strict();
export const coachingAnswerSchema = z
  .object({
    action: z.enum(['accept', 'decline', 'end']),
    revision: z.number().int().positive(),
  })
  .strict();
export const coachingPageSchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10000).default(1),
  })
  .strict();

export type CoachingStatus = 'pending' | 'active' | 'declined' | 'ended';
export type CoachingRelationship = {
  id: string;
  coachId: string;
  studentId: string | null;
  initiatedBy?: string | null;
  status: CoachingStatus;
  expiresAt: Date;
};
