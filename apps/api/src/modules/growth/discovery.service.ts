import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { DatabaseService } from '../../database/database.service';
import { rows } from '../commerce/commerce.service';
import { businessAccess } from '../advanced-business/ph5.access';
import { trainingCommand } from '../training/training.service';
import { publicServiceVisible } from '../commerce/public-service';
import { resourceAvailable } from '../commerce/resource-capacity';
import { offerPrice } from './offers';
export const recommendationQuery = z
  .object({
    q: z.string().trim().max(80).default(''),
    level: z.enum(['any', 'beginner']).default('any'),
    branchId: z.uuid().optional(),
    from: z.iso.datetime({ offset: true }).optional(),
    to: z.iso.datetime({ offset: true }).optional(),
    offersOnly: z.enum(['true', 'false']).default('false'),
  })
  .strict()
  .refine((v) => !v.from || !v.to || v.from <= v.to);
export const offerInput = z
  .object({
    operationId: z.uuid(),
    occurrenceId: z.uuid(),
    discountBasisPoints: z.number().int().min(1).max(5000),
    maxUses: z.number().int().min(1).max(10000),
    endsAt: z.iso.datetime({ offset: true }),
    revision: z.number().int().nonnegative(),
    active: z.boolean(),
  })
  .strict();
@Injectable()
export class GrowthDiscoveryService {
  constructor(private readonly database: DatabaseService) {}
  async recommend(input: z.infer<typeof recommendationQuery>) {
    const term = '%' + input.q.replace(/[\\%_]/g, '\\$&') + '%';
    const candidates = await rows<{
      id: string;
      service_id: string;
      amount_minor: string;
      level: string;
      remaining: number;
    }>(
      this.database.db,
      sql`SELECT o.id,s.id service_id,v.title,v.description,v.level,v.amount_minor::text,b.name branch_name,o.start_at,o.end_at,
   o.capacity-(SELECT coalesce(sum(r.quantity),0)::int FROM sport_reservations r WHERE r.occurrence_id=o.id AND (r.status IN ('confirmed','pending_approval','completed','no_show') OR r.status='held' AND r.expires_at>now())) remaining
   FROM sport_occurrences o JOIN sport_services s ON s.id=o.service_id JOIN sport_service_versions v ON v.id=s.published_version_id JOIN sport_service_versions ov ON ov.id=o.version_id JOIN branches b ON b.id=s.branch_id
   WHERE ${publicServiceVisible} AND o.status='scheduled' AND o.start_at>now() AND (${resourceAvailable})
   ${input.branchId ? sql`AND s.branch_id=${input.branchId}` : sql``} ${input.from ? sql`AND o.start_at>=${input.from}` : sql``} ${input.to ? sql`AND o.end_at<=${input.to}` : sql``}
   AND (${input.q}='' OR v.title ILIKE ${term} OR v.description ILIKE ${term})
   AND (${input.level}='any' OR lower(v.level) IN ('beginner','مبتدی','تازه‌کار'))
   ${input.offersOnly === 'true' ? sql`AND EXISTS(SELECT 1 FROM growth_offers g WHERE g.occurrence_id=o.id AND g.active AND g.ends_at>now() AND (SELECT count(*) FROM sport_orders ord WHERE coalesce(ord.snapshot->>'kind','')<>'split_share' AND ord.snapshot->>'offerId'=g.id::text AND ord.status NOT IN ('cancelled','refunded'))<g.max_uses)` : sql``}
   ORDER BY o.start_at,o.id LIMIT 100`,
    );
    const result: Array<
      (typeof candidates)[number] & {
        original_amount_minor: string;
        offer_id: string | null;
        reasons: string[];
      }
    > = [];
    for (const row of candidates) {
      if (row.remaining < 1) continue;
      const price = await offerPrice(
        this.database.db,
        row.id,
        row.amount_minor,
      );
      if (input.offersOnly === 'true' && !price.offerId) continue;
      result.push({
        ...row,
        original_amount_minor: row.amount_minor,
        amount_minor: price.amount,
        offer_id: price.offerId,
        reasons: [
          ...(input.level === 'beginner' ? ['beginner'] : []),
          ...(price.offerId ? ['discount'] : []),
          'available',
          ...(input.from || input.to ? ['time'] : []),
        ],
      });
      if (result.length === 30) break;
    }
    return { items: result, limited: candidates.length === 100 };
  }
  async saveOffer(actor: string, input: z.infer<typeof offerInput>) {
    const [scope] = await rows<{ organization_id: string; branch_id: string }>(
      this.database.db,
      sql`SELECT s.organization_id,s.branch_id FROM sport_occurrences o JOIN sport_services s ON s.id=o.service_id WHERE o.id=${input.occurrenceId}`,
    );
    if (!scope) throw new NotFoundException('Growth.notFound');
    return trainingCommand(
      this.database.db,
      actor,
      input.operationId,
      ['offer.save', input],
      async (tx) => {
        const [occurrence] = await rows<{
          capacity: number;
          start_at: Date;
          kind: string;
        }>(
          tx,
          sql`SELECT o.capacity,o.start_at,s.kind FROM sport_occurrences o JOIN sport_services s ON s.id=o.service_id WHERE o.id=${input.occurrenceId} AND o.status='scheduled' FOR UPDATE OF o`,
        );
        if (
          !occurrence ||
          !['class', 'court', 'access'].includes(occurrence.kind) ||
          (input.active && new Date(input.endsAt) <= new Date()) ||
          new Date(input.endsAt) > occurrence.start_at ||
          input.maxUses > occurrence.capacity
        )
          throw new ConflictException('Growth.invalidOffer');
        const [old] = await rows<{ revision: number; id: string }>(
          tx,
          sql`SELECT id,revision FROM growth_offers WHERE occurrence_id=${input.occurrenceId} FOR UPDATE`,
        );
        if ((old?.revision ?? 0) !== input.revision)
          throw new ConflictException('Growth.conflict');
        if (old) {
          const [used] = await rows<{ count: number }>(
            tx,
            sql`SELECT count(*)::int count FROM sport_orders WHERE coalesce(snapshot->>'kind','')<>'split_share' AND snapshot->>'offerId'=${old.id} AND status NOT IN ('cancelled','refunded')`,
          );
          if (input.maxUses < used.count)
            throw new ConflictException('Growth.invalidOffer');
        }
        const [saved] = await rows(
          tx,
          sql`INSERT INTO growth_offers(occurrence_id,discount_basis_points,max_uses,ends_at,active,created_by) VALUES(${input.occurrenceId},${input.discountBasisPoints},${input.maxUses},${input.endsAt},${input.active},${actor}) ON CONFLICT(occurrence_id) DO UPDATE SET discount_basis_points=excluded.discount_basis_points,max_uses=excluded.max_uses,ends_at=excluded.ends_at,active=excluded.active,revision=growth_offers.revision+1 RETURNING id,revision`,
        );
        await tx.execute(
          sql`INSERT INTO audit_events(actor_id,organization_id,action,target_id,details) VALUES(${actor},${scope.organization_id},'offer.saved',${saved.id},${JSON.stringify({ discountBasisPoints: input.discountBasisPoints, maxUses: input.maxUses })}::jsonb)`,
        );
        return saved;
      },
      (tx) =>
        businessAccess(tx, actor, scope.organization_id, scope.branch_id, [
          'owner',
          'manager',
        ]),
    );
  }
  async offers(actor: string, org: string, branch: string) {
    return this.database.db.transaction(async (tx) => {
      await businessAccess(tx, actor, org, branch, ['owner', 'manager']);
      return rows(
        tx,
        sql`SELECT g.*,v.title,o.start_at FROM growth_offers g JOIN sport_occurrences o ON o.id=g.occurrence_id JOIN sport_services s ON s.id=o.service_id JOIN sport_service_versions v ON v.id=s.published_version_id WHERE s.organization_id=${org} AND s.branch_id=${branch} ORDER BY o.start_at DESC LIMIT 100`,
      );
    });
  }
}
