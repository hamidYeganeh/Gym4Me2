import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { CommerceService, rows } from './commerce.service';
import { lockWritableAccount } from '../auth/account-lock';
import type { NotificationPageInput } from './community-page';

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
        await lockWritableAccount(tx, userId);
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
      sql`SELECT * FROM sport_tickets WHERE user_id=${userId} ORDER BY created_at DESC LIMIT 100`,
    );
  }
  async createTicket(
    userId: string,
    title: string,
    body: string,
    orderId?: string,
  ) {
    if (orderId) await this.commerce.myOrder(userId, orderId);
    return this.db.transaction(async (tx) => {
      const [ticket] = await rows<{ id: string }>(
        tx,
        sql`INSERT INTO sport_tickets(user_id,title,order_id) VALUES(${userId},${title},${orderId ?? null}) RETURNING *`,
      );
      await rows(
        tx,
        sql`INSERT INTO sport_ticket_messages(ticket_id,sender_id,body) VALUES(${ticket.id},${userId},${body})`,
      );
      return ticket;
    });
  }
  async ticket(userId: string, id: string) {
    const [ticket] = await rows(
      this.db,
      sql`SELECT * FROM sport_tickets WHERE id=${id} AND user_id=${userId}`,
    );
    if (!ticket) throw new NotFoundException();
    return {
      ...ticket,
      messages: await rows(
        this.db,
        sql`SELECT * FROM sport_ticket_messages WHERE ticket_id=${id} ORDER BY created_at LIMIT 100`,
      ),
    };
  }
  async reply(userId: string, id: string, body: string) {
    await this.ticket(userId, id);
    const [message] = await rows(
      this.db,
      sql`INSERT INTO sport_ticket_messages(ticket_id,sender_id,body) VALUES(${id},${userId},${body}) RETURNING *`,
    );
    return message;
  }
}
