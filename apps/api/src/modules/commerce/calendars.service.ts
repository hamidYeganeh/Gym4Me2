import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { lockWritableAccount } from '../auth/account-lock';
import { CommerceService, rows, jsonDto, type Row } from './commerce.service';
import type {
  CalendarScope,
  CalendarSettingsInput,
} from './calendars.contracts';

type Calendar = Row & {
  id: string;
  organization_id: string;
  branch_id: string;
  revision: number;
};

@Injectable()
export class SportsCalendarService {
  constructor(
    private readonly database: DatabaseService,
    private readonly commerce: CommerceService,
  ) {}
  private get db() {
    return this.database.db;
  }
  async host(actor: string, scope: CalendarScope) {
    const member = await this.commerce.staff(
      this.db,
      actor,
      scope.organizationId,
      scope.branchId,
      ['owner', 'manager', 'receptionist', 'accountant'],
    );
    const [branch] = await rows(
      this.db,
      sql`SELECT b.name branch_name,o.name club_name FROM branches b JOIN organizations o ON o.id=b.organization_id JOIN branch_profiles bp ON bp.branch_id=b.id AND bp.club_id=b.organization_id WHERE b.id=${scope.branchId} AND b.organization_id=${scope.organizationId} AND bp.archived_at IS NULL`,
    );
    if (!branch) throw new NotFoundException('Backend.calendarUnavailable');
    const [calendar] = await rows<Calendar>(
      this.db,
      sql`SELECT * FROM sport_calendars WHERE organization_id=${scope.organizationId} AND branch_id=${scope.branchId}`,
    );
    return {
      ...branch,
      calendar: calendar ?? null,
      can_manage: ['owner', 'manager'].includes(member.role),
    };
  }
  async save(
    actor: string,
    scope: CalendarScope,
    input: CalendarSettingsInput,
  ) {
    return this.db.transaction(async (tx) => {
      await lockWritableAccount(tx, actor);
      await this.commerce.staff(
        tx,
        actor,
        scope.organizationId,
        scope.branchId,
      );
      const [branch] = await rows(
        tx,
        sql`SELECT b.id FROM branches b JOIN branch_profiles bp ON bp.branch_id=b.id AND bp.club_id=b.organization_id WHERE b.id=${scope.branchId} AND b.organization_id=${scope.organizationId} AND bp.archived_at IS NULL FOR UPDATE OF b,bp`,
      );
      if (!branch) throw new NotFoundException('Backend.calendarUnavailable');
      const key = `calendar-settings:${input.idempotencyKey}`;
      await rows(
        tx,
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${actor}:${key}`},0))`,
      );
      const hash = createHash('sha256')
        .update(JSON.stringify({ ...scope, ...input }))
        .digest('hex');
      const [previous] = await rows<{ request_hash: string; result: Row }>(
        tx,
        sql`SELECT request_hash,result FROM sport_command_receipts WHERE user_id=${actor} AND command_key=${key}`,
      );
      if (previous) {
        if (previous.request_hash !== hash)
          throw new ConflictException('Backend.calendarKeyReused');
        return previous.result;
      }
      const [current] = await rows<Calendar>(
        tx,
        sql`SELECT * FROM sport_calendars WHERE branch_id=${scope.branchId} AND organization_id=${scope.organizationId} FOR UPDATE`,
      );
      if ((current?.revision ?? 0) !== input.revision)
        throw new ConflictException('Backend.calendarChanged');
      const [changed] = current
        ? await rows<Calendar>(
            tx,
            sql`UPDATE sport_calendars SET title=${input.title},description=${input.description},revision=revision+1,updated_at=now() WHERE id=${current.id} RETURNING *`,
          )
        : await rows<Calendar>(
            tx,
            sql`INSERT INTO sport_calendars(organization_id,branch_id,title,description) VALUES(${scope.organizationId},${scope.branchId},${input.title},${input.description}) RETURNING *`,
          );
      await rows(
        tx,
        sql`INSERT INTO audit_events(actor_id,organization_id,action,target_id,details) VALUES(${actor},${scope.organizationId},${current ? 'sports.calendar.updated' : 'sports.calendar.created'},${changed.id},${JSON.stringify({ branchId: scope.branchId, revision: changed.revision })}::jsonb)`,
      );
      const result = jsonDto(changed) as Row;
      await rows(
        tx,
        sql`INSERT INTO sport_command_receipts(user_id,command_key,request_hash,result) VALUES(${actor},${key},${hash},${JSON.stringify(result)}::jsonb)`,
      );
      return result;
    });
  }
}
