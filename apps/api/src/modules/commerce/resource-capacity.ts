import { ConflictException } from '@nestjs/common';
import { sql, type SQL } from 'drizzle-orm';
import type { Db, Tx } from '../clubs/club.repository';

type ResourceScope = {
  organization_id: string;
  branch_id: string;
  resource_ids: string[];
};
export async function resourceClaims(tx: Tx, scope: ResourceScope) {
  if (!scope.resource_ids.length) return [];
  const ids = `{${[...new Set(scope.resource_ids)].join(',')}}`;
  // Lock resources before units in every writer. Buffer changes cannot race a new claim.
  const resources = (
    await tx.execute(sql`SELECT id,active FROM sport_resources
    WHERE id=ANY(${ids}::uuid[]) AND organization_id=${scope.organization_id} AND branch_id=${scope.branch_id}
    ORDER BY id FOR SHARE`)
  ).rows as { id: string; active: boolean }[];
  if (
    resources.length !== new Set(scope.resource_ids).size ||
    resources.some((r) => !r.active)
  )
    throw new ConflictException('Backend.resourceUnavailable');
  await tx.execute(sql`SELECT id FROM sport_conflict_units
    WHERE id IN(SELECT unit_id FROM sport_resource_units WHERE resource_id=ANY(${ids}::uuid[]))
    ORDER BY id FOR UPDATE`);
  return (
    await tx.execute(sql`SELECT ru.unit_id id,max(r.buffer_before_minutes)::int before,max(r.buffer_after_minutes)::int after
    FROM sport_resource_units ru JOIN sport_resources r ON r.id=ru.resource_id
    WHERE r.id=ANY(${ids}::uuid[]) GROUP BY ru.unit_id ORDER BY ru.unit_id`)
  ).rows as { id: string; before: number; after: number }[];
}

/** Correlated with occurrence alias o and its version alias ov. No capacity is acquired by a read. */
export const resourceAvailable = sql`NOT EXISTS(
  SELECT 1 FROM sport_resources r WHERE r.id=ANY(ov.resource_ids) AND NOT r.active
) AND NOT EXISTS(
  SELECT 1 FROM sport_resource_units ru JOIN sport_resources r ON r.id=ru.resource_id
  JOIN sport_occupancies c ON c.unit_id=ru.unit_id
  WHERE r.id=ANY(ov.resource_ids) AND c.active AND c.occurrence_id IS DISTINCT FROM o.id
    AND c.period && tstzrange(o.start_at-r.buffer_before_minutes*interval '1 minute',o.end_at+r.buffer_after_minutes*interval '1 minute','[)')
)`;

export async function assertResourcesAvailable(
  db: Db | Tx,
  occurrenceId: string,
) {
  const result =
    await db.execute(sql`SELECT (${resourceAvailable}) available FROM sport_occurrences o
    JOIN sport_service_versions ov ON ov.id=o.version_id WHERE o.id=${occurrenceId}`);
  if (!result.rows[0]?.available)
    throw new ConflictException('Backend.resourceUnavailable');
}

export async function insertResourceClaim(tx: Tx, claim: SQL) {
  try {
    await tx.execute(claim);
  } catch (error) {
    const pg = error as { code?: string; cause?: { code?: string } };
    if ((pg.code ?? pg.cause?.code) === '23P01')
      throw new ConflictException('Backend.resourceConflict');
    throw error;
  }
}
