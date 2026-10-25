import { z } from 'zod';
export const command = { operationId: z.uuid() };
export const scope = z
  .object({
    organizationId: z.uuid(),
    branchId: z.uuid(),
    page: z.coerce.number().int().min(1).max(10000).default(1),
  })
  .strict();
export const stage = z.enum(['new', 'contacted', 'trial', 'won', 'lost']);
export const lead = z
  .object({
    ...command,
    organizationId: z.uuid(),
    branchId: z.uuid(),
    name: z.string().trim().min(1).max(160),
    phone: z
      .string()
      .trim()
      .regex(/^(?:\+98|0)?9\d{9}$/)
      .transform((v) => '+98' + v.replace(/^(?:\+98|0)/, '')),
    stage,
    note: z.string().trim().max(2000),
    followUpAt: z.iso.datetime({ offset: true }).nullable(),
  })
  .strict();
export const editLead = lead
  .omit({ phone: true, organizationId: true, branchId: true })
  .extend({
    revision: z.number().int().positive(),
    archived: z.boolean().default(false),
  });
export const campaign = z
  .object({
    ...command,
    organizationId: z.uuid(),
    branchId: z.uuid(),
    title: z.string().trim().min(1).max(120),
    body: z.string().trim().min(1).max(1000),
    stage: z.enum(['new', 'contacted', 'trial', 'won', 'lost', 'all']),
  })
  .strict();
export const send = z
  .object({
    ...command,
    revision: z.number().int().positive(),
    audienceHash: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
