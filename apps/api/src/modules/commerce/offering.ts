import { BadRequestException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Db, Tx } from '../clubs/club.repository';

export const offeringSchema = z
  .object({
    includedServiceIds: z.array(z.uuid()).max(100).default([]),
    entryAllowed: z.boolean().default(true),
    entryLimitPerDay: z.number().int().min(1).max(20).nullable().default(null),
    audience: z.enum(['all', 'men', 'women', 'family']).default('all'),
    maxTickets: z.number().int().min(1).max(20).default(20),
    deliveryDays: z.number().int().min(1).max(90).default(3),
    supportDays: z.number().int().min(0).max(365).default(30),
    maxRevisions: z.number().int().min(0).max(100).nullable().default(null),
    responseHours: z.number().int().min(1).max(720).nullable().default(null),
    confirmation: z.enum(['instant', 'before_payment']).default('instant'),
  })
  .strict();
export type Offering = z.infer<typeof offeringSchema>;
export const participantSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    birthDate: z.iso.date().nullable().default(null),
    gender: z.enum(['male', 'female', 'unspecified']).default('unspecified'),
  })
  .strict();
export type Participant = z.infer<typeof participantSchema>;

/** Sport and purchase format are independent: no sport-specific checkout paths. */
export async function validateOffering(
  db: Db | Tx,
  input: {
    sportId: string | null;
    organizationId: string;
    branchId: string;
    offering: Offering;
    kind: string;
    coachUserId: string | null;
  },
) {
  if (
    input.offering.confirmation === 'before_payment' &&
    ['membership', 'program'].includes(input.kind)
  )
    throw new BadRequestException('Workflow.coordinationNeedsSession');
  if (input.sportId) {
    const result = await db.execute(
      sql`SELECT id FROM sports WHERE id=${input.sportId} AND is_active`,
    );
    if (!result.rows.length)
      throw new BadRequestException('Workflow.invalidSport');
  }
  for (const id of new Set(input.offering.includedServiceIds)) {
    const result = await db.execute(
      sql`SELECT id FROM sport_services WHERE id=${id} AND organization_id=${input.organizationId} AND branch_id=${input.branchId} AND kind NOT IN ('membership','program') AND status<>'archived'`,
    );
    if (!result.rows.length)
      throw new BadRequestException('Workflow.invalidBenefit');
  }
  if (input.kind === 'program' && !input.coachUserId)
    throw new BadRequestException('Workflow.coachRequired');
}

export function validateParticipants(
  input: {
    quantity?: number;
    participants?: Participant[];
    membershipId?: string | null;
  },
  service: {
    kind: string;
    offering: Offering;
    eligibility: { minimumAge: number | null; maximumAge: number | null };
  },
  at: Date,
) {
  const quantity = input.quantity ?? 1;
  if (quantity > 1 && input.membershipId)
    throw new BadRequestException('Workflow.personalMembershipOnly');
  if (quantity > 1 && service.kind !== 'access')
    throw new BadRequestException('Workflow.singleParticipant');
  if (quantity > service.offering.maxTickets)
    throw new BadRequestException('Workflow.ticketLimit');
  const participants = input.participants ?? [];
  const requiresIdentity =
    quantity > 1 ||
    service.offering.audience !== 'all' ||
    service.eligibility.minimumAge !== null ||
    service.eligibility.maximumAge !== null;
  if (
    (participants.length && participants.length !== quantity) ||
    (requiresIdentity && participants.length !== quantity)
  )
    throw new BadRequestException('Workflow.participantRequired');
  for (const person of participants) {
    if (
      (service.offering.audience === 'men' && person.gender !== 'male') ||
      (service.offering.audience === 'women' && person.gender !== 'female')
    )
      throw new BadRequestException('Workflow.audienceMismatch');
    if (person.birthDate) {
      const birth = new Date(`${person.birthDate}T00:00:00Z`);
      const age =
        at.getUTCFullYear() -
        birth.getUTCFullYear() -
        (at.toISOString().slice(5, 10) < person.birthDate.slice(5) ? 1 : 0);
      if (
        birth > at ||
        age > 120 ||
        (service.eligibility.minimumAge !== null &&
          age < service.eligibility.minimumAge) ||
        (service.eligibility.maximumAge !== null &&
          age > service.eligibility.maximumAge)
      )
        throw new BadRequestException('Workflow.ageMismatch');
    } else if (
      service.eligibility.minimumAge !== null ||
      service.eligibility.maximumAge !== null
    )
      throw new BadRequestException('Workflow.birthDateRequired');
  }
  return quantity;
}

export const effectiveMembershipOffering = sql`(v.offering||jsonb_build_object('includedServiceIds',coalesce(m.benefit_service_ids,v.offering->'includedServiceIds'),'entryAllowed',coalesce(m.entry_allowed_override,(v.offering->>'entryAllowed')::boolean)))`;
