import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { z } from 'zod';
import { DatabaseService } from '../../database/database.service';
import type { Db, Tx } from '../clubs/club.repository';
import { businessAccess } from '../advanced-business/ph5.access';
import { rows } from '../commerce/commerce.service';
import { deliverSportsNotification } from '../commerce/notification-delivery';
import { trainingCommand } from '../training/training.service';
import * as c from './growth.contracts';
type Lead = {
  id: string;
  organization_id: string;
  branch_id: string;
  revision: number;
  stage: string;
};
type Campaign = Lead & { title: string; body: string; status: string };
const digest = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
@Injectable()
export class CrmService {
  constructor(private readonly database: DatabaseService) {}
  private get db() {
    return this.database.db;
  }
  async options(actor: string) {
    return rows(
      this.db,
      sql`SELECT b.id,b.organization_id,b.name,o.name organization_name,m.role FROM branches b JOIN organizations o ON o.id=b.organization_id JOIN organization_members m ON m.organization_id=o.id WHERE m.user_id=${actor} AND m.role IN ('owner','manager','receptionist') AND (m.role='owner' OR m.all_branches OR EXISTS(SELECT 1 FROM organization_member_branches mb WHERE mb.member_id=m.id AND mb.branch_id=b.id)) ORDER BY o.name,b.name,b.id`,
    );
  }
  private access(tx: Tx, actor: string, org: string, branch: string) {
    return businessAccess(tx, actor, org, branch, [
      'owner',
      'manager',
      'receptionist',
    ]);
  }
  async overview(actor: string, input: z.infer<typeof c.scope>) {
    return this.db.transaction(async (tx) => {
      await this.access(tx, actor, input.organizationId, input.branchId);
      const where = sql`organization_id=${input.organizationId} AND branch_id=${input.branchId}`;
      const leads = await rows(
        tx,
        sql`SELECT id,name,phone,stage,note,follow_up_at,revision FROM growth_leads WHERE ${where} AND NOT archived ORDER BY follow_up_at ASC NULLS LAST,id LIMIT 51 OFFSET ${(input.page - 1) * 50}`,
      );
      const campaigns = await rows(
        tx,
        sql`SELECT id,title,body,stage,status,revision,sent_at,(SELECT count(*)::int FROM growth_campaign_deliveries d WHERE d.campaign_id=growth_campaigns.id) delivered FROM growth_campaigns WHERE ${where} ORDER BY created_at DESC,id LIMIT 50`,
      );
      const funnel = await rows(
        tx,
        sql`SELECT stage,count(*)::int count,count(*) FILTER(WHERE follow_up_at<=now())::int overdue FROM growth_leads WHERE ${where} AND NOT archived GROUP BY stage ORDER BY stage`,
      );
      return {
        leads: leads.slice(0, 50),
        hasMore: leads.length > 50,
        campaigns,
        funnel,
      };
    });
  }
  async createLead(actor: string, input: z.infer<typeof c.lead>) {
    return trainingCommand(
      this.db,
      actor,
      input.operationId,
      ['crm.create', input],
      async (tx) => {
        const [saved] = await rows(
          tx,
          sql`INSERT INTO growth_leads(organization_id,branch_id,contact_id,name,phone,stage,note,follow_up_at) VALUES(${input.organizationId},${input.branchId},(SELECT id FROM users WHERE phone=${input.phone} AND status='active' AND deleted_at IS NULL AND NOT deletion_pending),${input.name},${input.phone},${input.stage},${input.note},${input.followUpAt}) ON CONFLICT(branch_id,phone) WHERE NOT archived DO NOTHING RETURNING id`,
        );
        if (!saved) throw new ConflictException('Growth.duplicate');
        await this.audit(
          tx,
          actor,
          input.organizationId,
          String(saved.id),
          'lead.created',
        );
        return saved;
      },
      (tx) => this.access(tx, actor, input.organizationId, input.branchId),
    );
  }
  async editLead(actor: string, id: string, input: z.infer<typeof c.editLead>) {
    const existing = await this.find<Lead>(this.db, 'lead', id);
    return trainingCommand(
      this.db,
      actor,
      input.operationId,
      ['crm.edit', id, input],
      async (tx) => {
        const [saved] = await rows(
          tx,
          sql`UPDATE growth_leads SET name=${input.name},stage=${input.stage},note=${input.note},follow_up_at=${input.followUpAt},archived=${input.archived},revision=revision+1,updated_at=now() WHERE id=${id} AND revision=${input.revision} RETURNING id,revision`,
        );
        if (!saved) throw new ConflictException('Growth.conflict');
        await tx.execute(
          sql`INSERT INTO growth_lead_events(lead_id,actor_id,stage,note) VALUES(${id},${actor},${input.stage},${input.note})`,
        );
        await this.audit(
          tx,
          actor,
          existing.organization_id,
          id,
          'lead.updated',
        );
        return saved;
      },
      (tx) =>
        this.access(tx, actor, existing.organization_id, existing.branch_id),
    );
  }
  private async find<T>(db: Db | Tx, kind: 'lead' | 'campaign', id: string) {
    const [row] = await rows<T>(
      db,
      kind === 'lead'
        ? sql`SELECT * FROM growth_leads WHERE id=${id}`
        : sql`SELECT * FROM growth_campaigns WHERE id=${id}`,
    );
    if (!row) throw new NotFoundException('Growth.notFound');
    return row;
  }
  async createCampaign(actor: string, input: z.infer<typeof c.campaign>) {
    return trainingCommand(
      this.db,
      actor,
      input.operationId,
      ['crm.campaign', input],
      async (tx) => {
        const [saved] = await rows(
          tx,
          sql`INSERT INTO growth_campaigns(organization_id,branch_id,title,body,stage,created_by) VALUES(${input.organizationId},${input.branchId},${input.title},${input.body},${input.stage},${actor}) RETURNING id`,
        );
        await this.audit(
          tx,
          actor,
          input.organizationId,
          String(saved.id),
          'campaign.created',
        );
        return saved;
      },
      (tx) => this.access(tx, actor, input.organizationId, input.branchId),
    );
  }
  private audience(tx: Tx, campaign: Campaign) {
    return rows<{ id: string }>(
      tx,
      sql`SELECT DISTINCT u.id FROM growth_leads l JOIN users u ON u.id=l.contact_id AND u.phone=l.phone JOIN account_preferences p ON p.user_id=u.id WHERE l.branch_id=${campaign.branch_id} AND NOT l.archived AND (${campaign.stage}='all' OR l.stage=${campaign.stage}) AND p.marketing_consent AND u.status='active' AND NOT u.deletion_pending AND u.deleted_at IS NULL ORDER BY u.id LIMIT 501`,
    );
  }
  async preview(actor: string, id: string) {
    return this.db.transaction(async (tx) => {
      const campaign = await this.find<Campaign>(tx, 'campaign', id);
      await this.access(
        tx,
        actor,
        campaign.organization_id,
        campaign.branch_id,
      );
      const audience = await this.audience(tx, campaign);
      if (audience.length > 500)
        throw new ConflictException('Growth.audienceLimit');
      return {
        count: audience.length,
        audienceHash: digest([campaign.revision, audience]),
        revision: campaign.revision,
      };
    });
  }
  async send(actor: string, id: string, input: z.infer<typeof c.send>) {
    const existing = await this.find<Campaign>(this.db, 'campaign', id);
    return trainingCommand(
      this.db,
      actor,
      input.operationId,
      ['crm.send', id, input],
      async (tx) => {
        const [campaign] = await rows<Campaign>(
          tx,
          sql`SELECT * FROM growth_campaigns WHERE id=${id} FOR UPDATE`,
        );
        if (campaign.status !== 'draft' || campaign.revision !== input.revision)
          throw new ConflictException('Growth.conflict');
        const audience = await this.audience(tx, campaign);
        if (
          audience.length > 500 ||
          digest([campaign.revision, audience]) !== input.audienceHash
        )
          throw new ConflictException('Growth.audienceChanged');
        let delivered = 0;
        for (const { id: userId } of audience) {
          // Lock preference and identity through commit; withdrawal wins before a send.
          const [eligible] = await rows(
            tx,
            sql`SELECT u.id FROM users u JOIN account_preferences p ON p.user_id=u.id WHERE u.id=${userId} AND p.marketing_consent AND u.status='active' AND NOT u.deletion_pending AND u.deleted_at IS NULL FOR SHARE OF u,p`,
          );
          if (!eligible) continue;
          const notification = await deliverSportsNotification(tx, {
            userId,
            title: campaign.title,
            body: campaign.body,
            href: '/notifications',
            sourceKey: `campaign:${id}:${userId}`,
          });
          if (notification) {
            await tx.execute(
              sql`INSERT INTO growth_campaign_deliveries(campaign_id,user_id,notification_id) VALUES(${id},${userId},${notification}) ON CONFLICT DO NOTHING`,
            );
            delivered++;
          }
        }
        await tx.execute(
          sql`UPDATE growth_campaigns SET status='sent',sent_at=now(),revision=revision+1 WHERE id=${id}`,
        );
        await this.audit(
          tx,
          actor,
          campaign.organization_id,
          id,
          'campaign.sent',
        );
        return { id, delivered };
      },
      (tx) =>
        this.access(tx, actor, existing.organization_id, existing.branch_id),
    );
  }
  private async audit(
    tx: Tx,
    actor: string,
    org: string,
    target: string,
    action: string,
  ) {
    await tx.execute(
      sql`INSERT INTO audit_events(actor_id,organization_id,action,target_id,details) VALUES(${actor},${org},${action},${target},'{}'::jsonb)`,
    );
  }
}
