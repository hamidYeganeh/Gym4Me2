import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { z } from 'zod';
import { DatabaseService } from '../../database/database.service';
import { lockWritableAccount } from '../auth/account-lock';
import type { Tx } from '../clubs/club.repository';
import { CommerceService, jsonDto, rows, type Row } from './commerce.service';
import { insertResourceClaim, resourceClaims } from './resource-capacity';
import type {
  resourceSettingsSchema,
  resourceBlockSchema,
  resourceBlockCancelSchema,
  resourceCalendarSchema,
} from './resources.contracts';
type Resource = Row & {
  id: string;
  organization_id: string;
  branch_id: string;
  name: string;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  revision: number;
};
@Injectable()
export class SportsResourceService {
  constructor(
    private readonly database: DatabaseService,
    private readonly commerce: CommerceService,
  ) {}
  private get db() {
    return this.database.db;
  }
  private async resource(userId: string, id: string, tx?: Tx) {
    const [resource] = await rows<Resource>(
      tx ?? this.db,
      sql`SELECT * FROM sport_resources WHERE id=${id} ${tx ? sql`FOR UPDATE` : sql``}`,
    );
    if (!resource) throw new NotFoundException('Backend.resourceNotFound');
    await this.commerce.staff(
      tx ?? this.db,
      userId,
      resource.organization_id,
      resource.branch_id,
    );
    return resource;
  }
  private command(
    userId: string,
    resourceId: string,
    kind: string,
    input: { idempotencyKey: string },
    write: (tx: Tx, resource: Resource) => Promise<Row>,
  ) {
    return this.db.transaction(async (tx) => {
      await lockWritableAccount(tx, userId);
      const resource = await this.resource(userId, resourceId, tx);
      const key = `resource-${kind}:${input.idempotencyKey}`;
      const fingerprint = createHash('sha256')
        .update(JSON.stringify({ resourceId, ...input }))
        .digest('hex');
      const [previous] = await rows<{ request_hash: string; result: Row }>(
        tx,
        sql`SELECT request_hash,result FROM sport_command_receipts WHERE user_id=${userId} AND command_key=${key}`,
      );
      if (previous) {
        if (previous.request_hash !== fingerprint)
          throw new ConflictException('Backend.scheduleKeyReused');
        return previous.result;
      }
      const result = jsonDto(await write(tx, resource)) as Row;
      await rows(
        tx,
        sql`INSERT INTO sport_command_receipts(user_id,command_key,request_hash,result) VALUES(${userId},${key},${fingerprint},${JSON.stringify(result)}::jsonb)`,
      );
      return result;
    });
  }
  private async audit(
    tx: Tx,
    userId: string,
    resource: Resource,
    action: string,
    target: string,
    details: Row,
  ) {
    await rows(
      tx,
      sql`INSERT INTO audit_events(actor_id,organization_id,action,target_id,details) VALUES(${userId},${resource.organization_id},${action},${target},${JSON.stringify({ resourceId: resource.id, branchId: resource.branch_id, ...details })}::jsonb)`,
    );
  }
  settings(
    userId: string,
    id: string,
    input: z.infer<typeof resourceSettingsSchema>,
  ) {
    return this.command(userId, id, 'settings', input, async (tx, resource) => {
      if (resource.revision !== input.revision)
        throw new ConflictException('Backend.resourceChanged');
      await resourceClaims(tx, { ...resource, resource_ids: [id] });
      if (
        resource.buffer_before_minutes !== input.bufferBeforeMinutes ||
        resource.buffer_after_minutes !== input.bufferAfterMinutes
      ) {
        const [future] = await rows<{ exists: boolean }>(
          tx,
          sql`SELECT EXISTS(
          SELECT 1 FROM sport_occupancies c JOIN sport_occurrences o ON o.id=coalesce(c.occurrence_id,(SELECT occurrence_id FROM sport_reservations WHERE id=c.reservation_id))
          JOIN sport_service_versions v ON v.id=o.version_id
          WHERE c.active AND upper(c.period)>now() AND ${id}=ANY(v.resource_ids)
        ) exists`,
        );
        if (future.exists)
          throw new ConflictException('Backend.resourceBufferLocked');
      }
      const [updated] = await rows(
        tx,
        sql`UPDATE sport_resources SET name=${input.name},buffer_before_minutes=${input.bufferBeforeMinutes},buffer_after_minutes=${input.bufferAfterMinutes},revision=revision+1 WHERE id=${id} RETURNING *,ARRAY(SELECT unit_id FROM sport_resource_units WHERE resource_id=${id} ORDER BY unit_id) unit_ids`,
      );
      await this.audit(tx, userId, resource, 'sports.resource.settings', id, {
        reason: input.reason,
        previous: {
          name: resource.name,
          before: resource.buffer_before_minutes,
          after: resource.buffer_after_minutes,
        },
        next: {
          name: input.name,
          before: input.bufferBeforeMinutes,
          after: input.bufferAfterMinutes,
        },
      });
      return updated;
    });
  }
  createBlock(
    userId: string,
    id: string,
    input: z.infer<typeof resourceBlockSchema>,
  ) {
    return this.command(userId, id, 'block', input, async (tx, resource) => {
      if (resource.revision !== input.revision)
        throw new ConflictException('Backend.resourceChanged');
      if (Date.parse(input.endAt) <= Date.now())
        throw new BadRequestException('Backend.invalidResourcePeriod');
      const units = await resourceClaims(tx, {
        ...resource,
        resource_ids: [id],
      });
      const [block] = await rows<{ id: string } & Row>(
        tx,
        sql`INSERT INTO sport_resource_blocks(organization_id,resource_id,kind,start_at,end_at,reason,actor_id)
        VALUES(${resource.organization_id},${id},${input.kind},${input.startAt},${input.endAt},${input.reason},${userId}) RETURNING *`,
      );
      for (const unit of units)
        await insertResourceClaim(
          tx,
          sql`INSERT INTO sport_occupancies(unit_id,block_id,period) VALUES(${unit.id},${block.id},tstzrange(${input.startAt},${input.endAt},'[)'))`,
        );
      await rows(
        tx,
        sql`UPDATE sport_resources SET revision=revision+1 WHERE id=${id}`,
      );
      await this.audit(
        tx,
        userId,
        resource,
        'sports.resource.block',
        block.id,
        {
          kind: input.kind,
          startAt: input.startAt,
          endAt: input.endAt,
          reason: input.reason,
        },
      );
      return block;
    });
  }
  cancelBlock(
    userId: string,
    id: string,
    blockId: string,
    input: z.infer<typeof resourceBlockCancelSchema>,
  ) {
    // Include the target in the receipt fingerprint as well as its namespace.
    return this.command(
      userId,
      id,
      `unblock:${blockId}`,
      input,
      async (tx, resource) => {
        await resourceClaims(tx, { ...resource, resource_ids: [id] });
        const [block] = await rows(
          tx,
          sql`UPDATE sport_resource_blocks SET active=false,cancelled_at=now(),revision=revision+1
        WHERE id=${blockId} AND resource_id=${id} AND revision=${input.revision} AND active RETURNING *`,
        );
        if (!block) throw new ConflictException('Backend.resourceChanged');
        await rows(
          tx,
          sql`UPDATE sport_occupancies SET active=false WHERE block_id=${blockId}`,
        );
        await rows(
          tx,
          sql`UPDATE sport_resources SET revision=revision+1 WHERE id=${id}`,
        );
        await this.audit(
          tx,
          userId,
          resource,
          'sports.resource.unblock',
          blockId,
          { reason: input.reason },
        );
        return block;
      },
    );
  }
  async calendar(
    userId: string,
    id: string,
    input: z.infer<typeof resourceCalendarSchema>,
  ) {
    await this.resource(userId, id);
    return rows(
      this.db,
      sql`SELECT coalesce(c.block_id,c.reservation_id,c.occurrence_id) id,
      CASE WHEN c.block_id IS NOT NULL THEN b.kind ELSE 'session' END kind,
      coalesce(ord.snapshot->>'title',v.title,b.reason) title,
      min(lower(c.period)) start_at,max(upper(c.period)) end_at,
      c.block_id,b.revision block_revision
      FROM sport_occupancies c JOIN sport_resource_units ru ON ru.unit_id=c.unit_id AND ru.resource_id=${id}
      LEFT JOIN sport_resource_blocks b ON b.id=c.block_id
      LEFT JOIN sport_reservations r ON r.id=c.reservation_id
      LEFT JOIN sport_orders ord ON ord.id=r.order_id
      LEFT JOIN sport_occurrences o ON o.id=coalesce(c.occurrence_id,r.occurrence_id)
      LEFT JOIN sport_service_versions v ON v.id=o.version_id
      WHERE c.active AND c.period && tstzrange(${input.from},${input.to},'[)')
      GROUP BY c.block_id,c.reservation_id,c.occurrence_id,b.kind,b.reason,b.revision,ord.snapshot->>'title',v.title
      ORDER BY min(lower(c.period)),coalesce(c.block_id,c.reservation_id,c.occurrence_id)`,
    );
  }
}
