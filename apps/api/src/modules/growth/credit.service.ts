import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { DatabaseService } from '../../database/database.service';
import { phoneSchema } from '../auth/auth.contracts';
import { trainingCommand } from '../training/training.service';
import { CommerceService, rows } from '../commerce/commerce.service';
import { businessAccess } from '../advanced-business/ph5.access';
import type { Db, Tx } from '../clubs/club.repository';
const cmd = { operationId: z.uuid() },
  amount = z.string().regex(/^[1-9][0-9]{0,11}$/),
  text = z.string().trim().min(5).max(500);
export const networkInput = z
  .object({
    ...cmd,
    organizationId: z.uuid(),
    name: z.string().trim().min(2).max(160),
    terms: z.string().trim().min(10).max(4000),
  })
  .strict();
export const networkMember = z
  .object({
    ...cmd,
    organizationId: z.uuid(),
    action: z.enum(['invite', 'accept', 'remove']),
  })
  .strict();
export const creditGrant = z
  .object({
    ...cmd,
    userId: z.uuid().optional(),
    phone: phoneSchema.optional(),
    amountMinor: amount,
    receipt: text,
    reason: text,
  })
  .strict()
  .refine((v) => !!v.userId !== !!v.phone);
export const creditPay = z
  .object({ ...cmd, networkId: z.uuid(), orderId: z.uuid() })
  .strict();
export const creditSettlement = z
  .object({
    ...cmd,
    organizationId: z.uuid(),
    amountMinor: amount,
    reference: text,
    reason: text,
  })
  .strict();
@Injectable()
export class NetworkCreditService {
  constructor(
    private readonly database: DatabaseService,
    private readonly commerce: CommerceService,
  ) {}
  private get db() {
    return this.database.db;
  }
  private async network(db: Db | Tx, id: string) {
    const [n] = await rows<{ id: string; issuer_organization_id: string }>(
      db,
      sql`SELECT * FROM credit_networks WHERE id=${id}`,
    );
    if (!n) throw new NotFoundException('Growth.notFound');
    return n;
  }
  async create(actor: string, input: z.infer<typeof networkInput>) {
    return trainingCommand(
      this.db,
      actor,
      input.operationId,
      ['credit.network', input],
      async (tx) => {
        const [n] = await rows(
          tx,
          sql`INSERT INTO credit_networks(issuer_organization_id,name,terms) VALUES(${input.organizationId},${input.name},${input.terms}) RETURNING id`,
        );
        await tx.execute(
          sql`INSERT INTO credit_network_members(network_id,organization_id,status,accepted_at) VALUES(${n.id},${input.organizationId},'accepted',now())`,
        );
        return n;
      },
      (tx) =>
        businessAccess(tx, actor, input.organizationId, undefined, ['owner']),
    );
  }
  async member(
    actor: string,
    id: string,
    input: z.infer<typeof networkMember>,
  ) {
    const n = await this.network(this.db, id),
      org =
        input.action === 'accept'
          ? input.organizationId
          : n.issuer_organization_id;
    return trainingCommand(
      this.db,
      actor,
      input.operationId,
      ['credit.member', id, input],
      async (tx) => {
        if (input.action === 'invite') {
          if (input.organizationId === n.issuer_organization_id)
            throw new ConflictException('Growth.conflict');
          await tx.execute(
            sql`INSERT INTO credit_network_members(network_id,organization_id,status) VALUES(${id},${input.organizationId},'invited') ON CONFLICT(network_id,organization_id) DO UPDATE SET status=CASE WHEN credit_network_members.status='accepted' THEN 'accepted' ELSE 'invited' END`,
          );
        } else {
          const [saved] = await rows(
            tx,
            input.action === 'accept'
              ? sql`UPDATE credit_network_members SET status='accepted',accepted_at=now() WHERE network_id=${id} AND organization_id=${input.organizationId} AND status='invited' RETURNING network_id`
              : sql`UPDATE credit_network_members SET status='removed' WHERE network_id=${id} AND organization_id=${input.organizationId} AND organization_id<>${n.issuer_organization_id} RETURNING network_id`,
          );
          if (!saved) throw new ConflictException('Growth.conflict');
        }
        await this.audit(
          tx,
          actor,
          org,
          id,
          'member.' + input.action,
          input.organizationId,
        );
        return { id };
      },
      (tx) => businessAccess(tx, actor, org, undefined, ['owner']),
    );
  }
  async grant(actor: string, id: string, input: z.infer<typeof creditGrant>) {
    const n = await this.network(this.db, id);
    return trainingCommand(
      this.db,
      actor,
      input.operationId,
      ['credit.grant', id, input],
      async (tx) => {
        const [recipient] = await rows<{ id: string }>(
          tx,
          sql`SELECT id FROM users WHERE (${input.userId ?? null}::uuid IS NOT NULL AND id=${input.userId ?? null}::uuid OR ${input.phone ?? null}::text IS NOT NULL AND phone=${input.phone ?? null}) AND status='active' AND deleted_at IS NULL AND NOT deletion_pending FOR SHARE`,
        );
        if (!recipient) throw new NotFoundException('Growth.notFound');
        await tx.execute(
          sql`INSERT INTO credit_accounts(network_id,user_id) VALUES(${id},${recipient.id}) ON CONFLICT DO NOTHING`,
        );
        await tx.execute(
          sql`SELECT balance_minor FROM credit_accounts WHERE network_id=${id} AND user_id=${recipient.id} FOR UPDATE`,
        );
        const [entry] = await rows(
          tx,
          sql`INSERT INTO credit_entries(network_id,user_id,organization_id,delta_minor,kind,source_key,receipt,actor_id) VALUES(${id},${recipient.id},${n.issuer_organization_id},${input.amountMinor},'grant',${`grant:${id}:${input.receipt}`},${input.receipt},${actor}) ON CONFLICT(source_key) DO NOTHING RETURNING id`,
        );
        if (!entry) throw new ConflictException('Growth.duplicateReceipt');
        await tx.execute(
          sql`UPDATE credit_accounts SET balance_minor=balance_minor+${input.amountMinor} WHERE network_id=${id} AND user_id=${recipient.id}`,
        );
        await this.audit(
          tx,
          actor,
          n.issuer_organization_id,
          id,
          'credit.granted',
          input.reason,
        );
        return entry;
      },
      (tx) =>
        businessAccess(tx, actor, n.issuer_organization_id, undefined, [
          'owner',
          'accountant',
        ]),
    );
  }
  async pay(actor: string, input: z.infer<typeof creditPay>) {
    return trainingCommand(
      this.db,
      actor,
      input.operationId,
      ['credit.pay', input],
      async (tx) => {
        const [account] = await rows<{ balance_minor: string }>(
          tx,
          sql`SELECT balance_minor::text FROM credit_accounts WHERE network_id=${input.networkId} AND user_id=${actor} FOR UPDATE`,
        );
        if (!account) throw new ConflictException('Growth.insufficientCredit');
        const [order] = await rows<{
          amount_minor: string;
          organization_id: string;
          snapshot: { kind: string };
        }>(
          tx,
          sql`SELECT amount_minor::text,organization_id,snapshot FROM sport_orders WHERE id=${input.orderId} AND user_id=${actor}`,
        );
        if (!order) throw new NotFoundException('Growth.notFound');
        if (order.snapshot.kind === 'split_share')
          throw new ConflictException('Growth.creditUnavailable');
        const [member] = await rows(
          tx,
          sql`SELECT organization_id FROM credit_network_members WHERE network_id=${input.networkId} AND organization_id=${order.organization_id} AND status='accepted' FOR SHARE`,
        );
        if (!member) throw new ForbiddenException('Growth.creditUnavailable');
        if (BigInt(account.balance_minor) < BigInt(order.amount_minor))
          throw new ConflictException('Growth.insufficientCredit');
        const [entry] = await rows(
          tx,
          sql`INSERT INTO credit_entries(network_id,user_id,organization_id,delta_minor,kind,order_id,source_key,actor_id) VALUES(${input.networkId},${actor},${order.organization_id},${'-' + order.amount_minor},'spend',${input.orderId},${`credit-pay:${input.orderId}`},${actor}) ON CONFLICT(source_key) DO NOTHING RETURNING id`,
        );
        if (!entry) throw new ConflictException('Growth.conflict');
        await tx.execute(
          sql`UPDATE credit_accounts SET balance_minor=balance_minor-${order.amount_minor} WHERE network_id=${input.networkId} AND user_id=${actor}`,
        );
        return this.commerce.settleInternalPayment(
          tx,
          actor,
          input.orderId,
          'network_credit',
          `credit:${input.orderId}`,
        );
      },
    );
  }
  async mine(actor: string) {
    return {
      accounts: await rows(
        this.db,
        sql`SELECT a.network_id,a.balance_minor::text,n.name,n.terms,ARRAY(SELECT organization_id FROM credit_network_members m WHERE m.network_id=n.id AND m.status='accepted') organization_ids FROM credit_accounts a JOIN credit_networks n ON n.id=a.network_id WHERE a.user_id=${actor} ORDER BY n.name`,
      ),
      entries: await rows(
        this.db,
        sql`SELECT id,network_id,organization_id,delta_minor::text,kind,order_id,created_at FROM credit_entries WHERE user_id=${actor} ORDER BY created_at DESC,id LIMIT 100`,
      ),
    };
  }
  async business(actor: string, org: string) {
    return this.db.transaction(async (tx) => {
      await businessAccess(tx, actor, org, undefined, ['owner', 'accountant']);
      return {
        networks: await rows(
          tx,
          sql`SELECT n.*,m.status FROM credit_networks n JOIN credit_network_members m ON m.network_id=n.id WHERE m.organization_id=${org} ORDER BY n.created_at DESC LIMIT 100`,
        ),
        members: await rows(
          tx,
          sql`SELECT m.network_id,m.organization_id,o.name,m.status FROM credit_network_members m JOIN organizations o ON o.id=m.organization_id JOIN credit_networks n ON n.id=m.network_id WHERE n.issuer_organization_id=${org} ORDER BY o.name LIMIT 500`,
        ),
        balances: await rows(
          tx,
          sql`SELECT n.id network_id,coalesce(-(SELECT sum(delta_minor) FROM credit_entries e WHERE e.network_id=n.id AND e.organization_id=${org} AND e.kind IN ('spend','refund')),0)::text earned_minor,coalesce((SELECT sum(amount_minor) FROM credit_settlements st WHERE st.network_id=n.id AND st.organization_id=${org}),0)::text settled_minor FROM credit_networks n JOIN credit_network_members m ON m.network_id=n.id AND m.organization_id=${org}`,
        ),
      };
    });
  }
  async settle(
    actor: string,
    id: string,
    input: z.infer<typeof creditSettlement>,
  ) {
    const n = await this.network(this.db, id);
    return trainingCommand(
      this.db,
      actor,
      input.operationId,
      ['credit.settle', id, input],
      async (tx) => {
        await tx.execute(
          sql`SELECT id FROM credit_networks WHERE id=${id} FOR UPDATE`,
        );
        const [balance] = await rows<{ due: string }>(
          tx,
          sql`SELECT coalesce(-(SELECT sum(delta_minor) FROM credit_entries WHERE network_id=${id} AND organization_id=${input.organizationId} AND kind IN ('spend','refund')),0)-coalesce((SELECT sum(amount_minor) FROM credit_settlements WHERE network_id=${id} AND organization_id=${input.organizationId}),0) due`,
        );
        if (BigInt(input.amountMinor) > BigInt(balance.due))
          throw new ConflictException('Growth.conflict');
        const [saved] = await rows(
          tx,
          sql`INSERT INTO credit_settlements(network_id,organization_id,amount_minor,reference,reason,actor_id) VALUES(${id},${input.organizationId},${input.amountMinor},${input.reference},${input.reason},${actor}) RETURNING id`,
        );
        await this.audit(
          tx,
          actor,
          n.issuer_organization_id,
          id,
          'credit.settled',
          input.reason,
        );
        return saved;
      },
      (tx) =>
        businessAccess(tx, actor, n.issuer_organization_id, undefined, [
          'owner',
          'accountant',
        ]),
    );
  }
  private async audit(
    tx: Tx,
    actor: string,
    org: string,
    id: string,
    action: string,
    reason: string,
  ) {
    await tx.execute(
      sql`INSERT INTO audit_events(actor_id,organization_id,action,target_id,details) VALUES(${actor},${org},${action},${id},${JSON.stringify({ reason })}::jsonb)`,
    );
  }
}
