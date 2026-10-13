import { z } from 'zod';

export const adminListFilters = z.object({
  search: z.string().trim().max(100).default(''),
  status: z.enum(['active', 'suspended']).optional(),
});
export const organizationFilters = z.object({
  search: z.string().trim().max(100).default(''),
  publicationStatus: z
    .enum(['draft', 'pending_review', 'published', 'hidden'])
    .optional(),
});
export const auditFilters = z
  .object({
    action: z.string().trim().max(100).optional(),
    actorId: z.uuid().optional(),
    organizationId: z.uuid().optional(),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
  })
  .refine(
    (v) => !v.from || !v.to || v.from <= v.to,
    'Backend.invalidDateRange',
  );
export type AuditFilters = z.infer<typeof auditFilters>;
