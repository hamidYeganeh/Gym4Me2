import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { z } from 'zod';
import { DatabaseService } from '../../database/database.service';
import { CommerceService, rows } from './commerce.service';
import { SportsWorkflowsService } from './workflows.service';
import { billingRows } from './billing';
import type { Db, Tx } from '../clubs/club.repository';
import * as c from './household-billing.contracts';

@Injectable()
export class HouseholdBillingService {
  constructor(
    private readonly database: DatabaseService,
    private readonly commerce: CommerceService,
    private readonly workflow: SportsWorkflowsService,
  ) {}
  private get db() {
    return this.database.db;
  }
  async dependents(actor: string) {
    return rows(
      this.db,
      sql`SELECT id,name,birth_date::text birth_date,gender,status,revision FROM sport_dependents WHERE guardian_id=${actor} ORDER BY created_at,id`,
    );
  }
  async dependent(
    actor: string,
    input: z.infer<typeof c.dependentInput>,
    id?: string,
    revision?: number,
    status = 'active',
  ) {
    return this.workflow.command<{ id: string; revision: number }>(
      actor,
      input.idempotencyKey,
      ['dependent', id, input, revision, status],
      async (tx) => {
        if (
          id &&
          !(
            await rows(
              tx,
              sql`SELECT id FROM sport_dependents WHERE id=${id} AND guardian_id=${actor}`,
            )
          ).length
        )
          throw new NotFoundException('Closure.dependentUnavailable');
      },
      async (tx) => {
        const valid = await rows(
          tx,
          sql`SELECT 1 WHERE ${input.birthDate}::date BETWEEN (now() AT TIME ZONE 'Asia/Tehran')::date-interval '120 years' AND (now() AT TIME ZONE 'Asia/Tehran')::date`,
        );
        if (!valid.length)
          throw new BadRequestException('Workflow.ageMismatch');
        let result: { id: string; revision: number }[];
        if (id)
          result = await rows<{ id: string; revision: number }>(
            tx,
            sql`UPDATE sport_dependents SET name=${input.name},birth_date=${input.birthDate}::date,gender=${input.gender},status=${status},revision=revision+1 WHERE id=${id} AND guardian_id=${actor} AND revision=${revision} RETURNING id,revision`,
          );
        else {
          const [count] = await rows<{ count: number }>(
            tx,
            sql`SELECT count(*)::int count FROM sport_dependents WHERE guardian_id=${actor} AND status='active'`,
          );
          if (count.count >= 20)
            throw new ConflictException('Closure.householdLimit');
          result = await rows<{ id: string; revision: number }>(
            tx,
            sql`INSERT INTO sport_dependents(guardian_id,name,birth_date,gender) VALUES(${actor},${input.name},${input.birthDate}::date,${input.gender}) RETURNING id,revision`,
          );
        }
        if (!result.length)
          throw new ConflictException('Closure.dependentChanged');
        await rows(
          tx,
          sql`INSERT INTO audit_events(actor_id,action,target_id,details) VALUES(${actor},'sports.dependent.updated',${result[0].id},${JSON.stringify({ status, revision: result[0].revision })}::jsonb)`,
        );
        return result[0];
      },
    );
  }
  private async billingAccess(
    tx: Db | Tx,
    actor: string,
    orderId: string,
    business: boolean,
    write = false,
  ) {
    const [o] = await rows<Parameters<CommerceService['fulfil']>[1]>(
      tx,
      sql`SELECT * FROM sport_orders WHERE id=${orderId}`,
    );
    if (!o) throw new NotFoundException();
    if (business)
      await this.commerce.staff(
        tx,
        actor,
        o.organization_id,
        o.snapshot.branchId,
        write
          ? ['owner', 'manager', 'accountant']
          : ['owner', 'manager', 'accountant', 'receptionist'],
      );
    else if (o.user_id !== actor) throw new NotFoundException();
    return o;
  }
  async installments(actor: string, orderId: string, business = false) {
    await this.billingAccess(this.db, actor, orderId, business);
    return billingRows(this.db, orderId);
  }
  async createInstallments(
    actor: string,
    orderId: string,
    input: z.infer<typeof c.installmentPlanInput>,
  ) {
    return this.workflow.command(
      actor,
      input.idempotencyKey,
      ['installments', orderId, input],
      (tx) => this.billingAccess(tx, actor, orderId, true, true),
      async (tx) => {
        const [o] = await rows<Parameters<CommerceService['fulfil']>[1]>(
          tx,
          sql`SELECT * FROM sport_orders WHERE id=${orderId} FOR UPDATE`,
        );
        if (
          o.snapshot.kind !== 'membership' ||
          !['awaiting_payment', 'partially_paid'].includes(o.status) ||
          BigInt(o.amount_minor) <= 0n
        )
          throw new ConflictException('Closure.installmentUnavailable');
        if (
          (
            await rows(
              tx,
              sql`SELECT id FROM sport_installment_plans WHERE order_id=${orderId}`,
            )
          ).length
        )
          throw new ConflictException('Closure.planExists');
        const sum = input.installments.reduce(
          (n, d) => n + BigInt(d.amountMinor),
          0n,
        );
        const [clock] = await rows<{ today: string }>(
          tx,
          sql`SELECT (now() AT TIME ZONE 'Asia/Tehran')::date::text today`,
        );
        if (
          sum !== BigInt(o.amount_minor) ||
          input.installments.some(
            (d, i) =>
              d.dueOn < clock.today ||
              (i > 0 && d.dueOn <= input.installments[i - 1].dueOn),
          )
        )
          throw new BadRequestException('Closure.installmentSchedule');
        if (
          (
            await rows(
              tx,
              sql`SELECT id FROM sport_payments WHERE order_id=${orderId} AND state IN ('pending','unknown')`,
            )
          ).length
        )
          throw new ConflictException('Workflow.reconcileFirst');
        const [plan] = await rows<{ id: string }>(
          tx,
          sql`INSERT INTO sport_installment_plans(order_id,activation,grace_days,created_by,reason) VALUES(${orderId},${input.activation},${input.graceDays},${actor},${input.reason}) RETURNING id`,
        );
        for (const [i, d] of input.installments.entries())
          await rows(
            tx,
            sql`INSERT INTO sport_installments(plan_id,ordinal,due_on,amount_minor) VALUES(${plan.id},${i + 1},${d.dueOn}::date,${d.amountMinor})`,
          );
        await rows(
          tx,
          sql`UPDATE sport_orders SET expires_at=(${input.installments.at(-1)!.dueOn}::date+${input.graceDays + 1}::int)::timestamp AT TIME ZONE 'Asia/Tehran' WHERE id=${orderId}`,
        );
        const [paid] = await rows<{ amount: string }>(
          tx,
          sql`SELECT coalesce(sum(amount_minor),0)::text amount FROM sport_payments WHERE order_id=${orderId} AND state='verified'`,
        );
        if (BigInt(paid.amount) > 0n) await this.commerce.fulfil(tx, o);
        await rows(
          tx,
          sql`INSERT INTO audit_events(actor_id,organization_id,action,target_id,details) VALUES(${actor},${o.organization_id},'sports.installments.created',${plan.id},${JSON.stringify(input)}::jsonb)`,
        );
        return { id: plan.id };
      },
    );
  }
  async readiness(
    actor: string,
    scope: { organizationId: string; branchId: string },
  ) {
    await this.commerce.staff(
      this.db,
      actor,
      scope.organizationId,
      scope.branchId,
      ['owner', 'manager'],
    );
    const services = await rows(
      this.db,
      sql`SELECT s.id,s.title,s.revision FROM sport_services s JOIN sport_service_versions v ON v.id=coalesce(s.published_version_id,(SELECT id FROM sport_service_versions WHERE service_id=s.id ORDER BY version DESC LIMIT 1)) WHERE s.organization_id=${scope.organizationId} AND s.branch_id=${scope.branchId} AND s.status<>'archived' AND v.sport_id IS NULL ORDER BY s.title`,
    );
    const memberships = await rows(
      this.db,
      sql`SELECT m.id,m.revision,v.title,u.display_name FROM sport_memberships m JOIN sport_service_versions v ON v.id=m.version_id JOIN users u ON u.id=m.user_id WHERE m.organization_id=${scope.organizationId} AND m.branch_id=${scope.branchId} AND m.benefits_reviewed_at IS NULL AND m.status IN ('active','frozen','pending') ORDER BY m.created_at`,
    );
    return { services, memberships };
  }
  async classifySport(
    actor: string,
    id: string,
    input: z.infer<typeof c.legacySportInput>,
  ) {
    return this.workflow.command(
      actor,
      input.idempotencyKey,
      ['classify', id, input],
      async (tx) => {
        const s = await this.commerce.service(tx, id);
        await this.commerce.staff(tx, actor, s.organization_id, s.branch_id, [
          'owner',
          'manager',
        ]);
      },
      async (tx) => {
        await rows(
          tx,
          sql`SELECT id FROM sport_services WHERE id=${id} FOR UPDATE`,
        );
        const s = await this.commerce.service(tx, id);
        if (Number(s.revision) !== input.revision || s.status === 'archived')
          throw new ConflictException('Backend.serviceChanged');
        if (
          !(
            await rows(
              tx,
              sql`SELECT id FROM sports WHERE id=${input.sportId} AND is_active`,
            )
          ).length
        )
          throw new BadRequestException('Workflow.invalidSport');
        const [v] = await rows<{ id: string }>(
          tx,
          sql`INSERT INTO sport_service_versions SELECT (jsonb_populate_record(NULL::sport_service_versions,to_jsonb(v)||jsonb_build_object('id',gen_random_uuid(),'version',(SELECT max(version)+1 FROM sport_service_versions WHERE service_id=${id}),'sport_id',${input.sportId}::uuid,'created_at',now()))).* FROM sport_service_versions v WHERE v.id=${s.version_id} RETURNING id`,
        );
        const publish =
          s.status === 'published' && s.published_version_id === s.version_id;
        await rows(
          tx,
          sql`UPDATE sport_services SET revision=revision+1,published_version_id=CASE WHEN ${publish} THEN ${v.id}::uuid ELSE published_version_id END WHERE id=${id}`,
        );
        if (publish) {
          await rows(
            tx,
            sql`INSERT INTO branch_sports(branch_id,sport_id) VALUES(${s.branch_id},${input.sportId}) ON CONFLICT DO NOTHING`,
          );
          await rows(
            tx,
            sql`INSERT INTO club_sport_links(club_id,sport_id) VALUES(${s.organization_id},${input.sportId}) ON CONFLICT DO NOTHING`,
          );
        }
        await rows(
          tx,
          sql`INSERT INTO audit_events(actor_id,organization_id,action,target_id,details) VALUES(${actor},${s.organization_id},'sports.legacy.classified',${id},${JSON.stringify(input)}::jsonb)`,
        );
        return { id, versionId: v.id, published: publish };
      },
    );
  }
}
