import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { supportCommand } from './support-command';
import type { z } from 'zod';
import type { supportCreateSchema } from './support.contracts';
import { DatabaseService } from '../../database/database.service';
import { CommerceService, rows } from './commerce.service';
import { lockWritableAccount } from '../auth/account-lock';
import type { NotificationPageInput } from './community-page';

type SupportTicketRecord = {
  id: string;
  title: string;
  user_id: string;
  order_id: string | null;
  status: 'open' | 'assigned' | 'resolved';
  category: string;
  priority: 'normal' | 'urgent';
  revision: number;
  assigned_to: string | null;
  resolution: string | null;
  created_at: Date;
  updated_at: Date;
};

@Injectable()
export class CommunityService {
  constructor(
    private readonly database: DatabaseService,
    private readonly commerce: CommerceService,
  ) {}
  private get db() {
    return this.database.db;
  }
  async notifications(userId: string) {
    return (await this.notificationPage(userId, { view: 'all' }, 100)).items;
  }
  async notificationPage(
    userId: string,
    input: NotificationPageInput,
    limit = 20,
  ) {
    const filter = sql`user_id=${userId} ${input.view === 'unread' ? sql`AND read_at IS NULL` : sql``}`;
    if (
      input.cursor &&
      !(
        await rows(
          this.db,
          sql`SELECT id FROM sport_notifications WHERE id=${input.cursor} AND ${filter}`,
        )
      ).length
    )
      throw new BadRequestException('Backend.invalidNotificationCursor');
    const items = await rows<{ id: string }>(
      this.db,
      sql`SELECT id,title,body,href,read_at,created_at FROM sport_notifications WHERE ${filter} ${input.cursor ? sql`AND (created_at,id)<(SELECT created_at,id FROM sport_notifications WHERE id=${input.cursor})` : sql``} ORDER BY created_at DESC,id DESC LIMIT ${limit + 1}`,
    );
    return {
      items: items.slice(0, limit),
      nextCursor: items.length > limit ? items[limit - 1].id : null,
    };
  }
  async readNotification(userId: string, id: string) {
    return this.db.transaction(async (tx) => {
      await lockWritableAccount(tx, userId);
      const [read] = await rows<{ read_at: Date }>(
        tx,
        sql`UPDATE sport_notifications SET read_at=coalesce(read_at,now()) WHERE id=${id} AND user_id=${userId} RETURNING read_at`,
      );
      if (!read) throw new NotFoundException('Backend.notificationUnavailable');
      return { ok: true, ...read };
    });
  }
  async notificationPreferences(
    userId: string,
    input?: { reminders: boolean; messages: boolean; invitations: boolean },
  ) {
    if (input)
      return this.db.transaction(async (tx) => {
        await lockWritableAccount(tx, userId, 'update');
        await rows(
          tx,
          sql`INSERT INTO sport_notification_preferences(user_id,reminders,messages,invitations) VALUES(${userId},${input.reminders},${input.messages},${input.invitations}) ON CONFLICT(user_id) DO UPDATE SET reminders=EXCLUDED.reminders,messages=EXCLUDED.messages,invitations=EXCLUDED.invitations`,
        );
        return input;
      });
    const [value] = await rows(
      this.db,
      sql`SELECT reminders,messages,invitations FROM sport_notification_preferences WHERE user_id=${userId}`,
    );
    return value ?? { reminders: true, messages: true, invitations: true };
  }
  async support(userId: string) {
    return rows(
      this.db,
      sql`SELECT * FROM sport_tickets WHERE user_id=${userId} ORDER BY updated_at DESC,id DESC LIMIT 100`,
    );
  }
  async createTicket(
    userId: string,
    title: string,
    body: string,
    orderId?: string,
    options?: Pick<
      z.infer<typeof supportCreateSchema>,
      'category' | 'idempotencyKey'
    >,
  ) {
    const category = options?.category ?? 'general';
    if (category !== 'general' && !orderId)
      throw new BadRequestException('Support.orderRequired');
    return supportCommand(
      this.db,
      userId,
      options?.idempotencyKey,
      ['create', title, body, orderId, category],
      async (tx) => {
        if (
          orderId &&
          !(
            await rows(
              tx,
              sql`SELECT id FROM sport_orders WHERE id=${orderId} AND user_id=${userId}`,
            )
          ).length
        )
          throw new NotFoundException('Workflow.orderUnavailable');
      },
      async (tx) => {
        const priority = ['entry_denied', 'provider_absent'].includes(category)
          ? 'urgent'
          : 'normal';
        const [ticket] = await rows<{ id: string }>(
          tx,
          sql`INSERT INTO sport_tickets(user_id,title,order_id,category,priority) VALUES(${userId},${title},${orderId ?? null},${category},${priority}) RETURNING *`,
        );
        await tx.execute(
          sql`INSERT INTO sport_ticket_messages(ticket_id,sender_id,body) VALUES(${ticket.id},${userId},${body})`,
        );
        await tx.execute(
          sql`INSERT INTO sport_ticket_events(ticket_id,kind) VALUES(${ticket.id},'created')`,
        );
        return ticket;
      },
    );
  }

  async ticket(userId: string, id: string) {
    const [ticket] = await rows<SupportTicketRecord>(
      this.db,
      sql`SELECT * FROM sport_tickets WHERE id=${id} AND user_id=${userId}`,
    );
    if (!ticket) throw new NotFoundException();
    return {
      ...ticket,
      messages: await rows(
        this.db,
        sql`SELECT id,body,created_at,(sender_id<>${userId}) from_support FROM (SELECT * FROM sport_ticket_messages WHERE ticket_id=${id} ORDER BY sequence DESC LIMIT 100) recent ORDER BY sequence`,
      ),
      events: await rows(
        this.db,
        sql`SELECT id,kind,created_at FROM (SELECT * FROM sport_ticket_events WHERE ticket_id=${id} ORDER BY sequence DESC LIMIT 200) recent ORDER BY sequence`,
      ),
    };
  }
  async reply(userId: string, id: string, body: string, key?: string) {
    return supportCommand(
      this.db,
      userId,
      key,
      ['reply', id, body],
      async (tx) => {
        if (
          !(
            await rows(
              tx,
              sql`SELECT id FROM sport_tickets WHERE id=${id} AND user_id=${userId}`,
            )
          ).length
        )
          throw new NotFoundException();
      },
      async (tx) => {
        const [ticket] = await rows<{ status: string }>(
          tx,
          sql`SELECT status FROM sport_tickets WHERE id=${id} FOR UPDATE`,
        );
        const [message] = await rows(
          tx,
          sql`INSERT INTO sport_ticket_messages(ticket_id,sender_id,body) VALUES(${id},${userId},${body}) RETURNING id,body,created_at`,
        );
        await tx.execute(
          sql`UPDATE sport_tickets SET status=CASE WHEN status='resolved' THEN 'open' ELSE status END,assigned_to=CASE WHEN status='resolved' THEN NULL ELSE assigned_to END,revision=revision+1,updated_at=now() WHERE id=${id}`,
        );
        await tx.execute(
          sql`INSERT INTO sport_ticket_events(ticket_id,kind) VALUES(${id},${ticket.status === 'resolved' ? 'reopened' : 'reply'})`,
        );
        return message;
      },
    );
  }
}
