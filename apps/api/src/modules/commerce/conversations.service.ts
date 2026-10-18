import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { sql, type SQL } from 'drizzle-orm';
import sharp from 'sharp';
import { createHash, randomUUID } from 'node:crypto';
import { DatabaseService } from '../../database/database.service';
import { StorageService } from '../clubs/storage.service';
import { rows, jsonDto } from './commerce.service';
import { lockWritableAccount } from '../auth/account-lock';
import { requireBranch, type Db, type Tx } from '../clubs/club.repository';
import type {
  ConversationPreferencesInput,
  ConversationStateInput,
} from './conversations.contracts';
import type {
  ConversationPageInput,
  HostConversationPageInput,
} from './community-page';
import { deliverSportsNotification } from './notification-delivery';

// The conversation list follows the same registration and branch-scoped host rules.
const eligible = (
  user: SQL,
  occurrence: string | SQL,
  organization: string | SQL,
  branch: string | SQL,
) => sql`(
 EXISTS(SELECT 1 FROM sport_reservations r WHERE r.occurrence_id=${occurrence} AND r.user_id=${user} AND r.status IN ('confirmed','completed'))
 OR EXISTS(SELECT 1 FROM organization_members om WHERE om.organization_id=${organization} AND om.user_id=${user} AND om.role IN ('owner','manager') AND (om.role='owner' OR om.all_branches OR EXISTS(SELECT 1 FROM organization_member_branches g WHERE g.member_id=om.id AND g.branch_id=${branch}))))`;

@Injectable()
export class SportsConversationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly storage: StorageService,
  ) {}
  private get db() {
    return this.database.db;
  }
  private async isHost(
    userId: string,
    organizationId: string,
    branchId: string,
    db: Db | Tx,
    locked = false,
  ) {
    const [member] = await rows<{
      id: string;
      role: string;
      all_branches: boolean;
    }>(
      db,
      sql`SELECT id,role,all_branches FROM organization_members WHERE user_id=${userId} AND organization_id=${organizationId} AND role IN ('owner','manager') ${locked ? sql`FOR SHARE` : sql``}`,
    );
    if (!member) return false;
    if (member.role === 'owner' || member.all_branches) return true;
    return (
      (
        await rows(
          db,
          sql`SELECT member_id FROM organization_member_branches WHERE organization_id=${organizationId} AND member_id=${member.id} AND branch_id=${branchId} ${locked ? sql`FOR SHARE` : sql``}`,
        )
      ).length > 0
    );
  }
  private async access(
    userId: string,
    id: string,
    db: Db | Tx = this.db,
    lock: 'none' | 'share' | 'update' = 'none',
  ) {
    const [conversation] = await rows<{
      id: string;
      occurrence_id: string;
      organization_id: string;
      branch_id: string;
      closed: boolean;
      revision: number;
      title: string;
    }>(
      db,
      sql`SELECT c.*,s.organization_id,s.branch_id FROM sport_conversations c JOIN sport_occurrences o ON o.id=c.occurrence_id JOIN sport_services s ON s.id=o.service_id WHERE c.id=${id} ${lock === 'update' ? sql`FOR UPDATE OF c` : lock === 'share' ? sql`FOR SHARE OF c` : sql``}`,
    );
    if (!conversation) throw new NotFoundException();
    const registrations = await rows(
      db,
      sql`SELECT id FROM sport_reservations WHERE occurrence_id=${conversation.occurrence_id} AND user_id=${userId} AND status IN ('confirmed','completed') FOR SHARE`,
    );
    const host = await this.isHost(
      userId,
      conversation.organization_id,
      conversation.branch_id,
      db,
      lock !== 'none',
    );
    if (!registrations.length && !host)
      throw new ForbiddenException('Conversation unavailable');
    const [preferences] = await rows<{ archived: boolean }>(
      db,
      sql`SELECT archived FROM sport_conversation_preferences WHERE user_id=${userId} AND conversation_id=${id}`,
    );
    const members = await rows(
      db,
      sql`SELECT DISTINCT u.id,u.display_name FROM sport_reservations r JOIN users u ON u.id=r.user_id JOIN sport_occurrences o ON o.id=r.occurrence_id JOIN sport_services s ON s.id=o.service_id JOIN sport_service_versions v ON v.id=s.published_version_id WHERE r.occurrence_id=${conversation.occurrence_id} AND r.status IN ('confirmed','completed') AND (${host} OR v.show_participants AND u.profile_public) AND u.deleted_at IS NULL AND NOT u.deletion_pending AND u.status='active'`,
    );
    return {
      ...conversation,
      host,
      members,
      archived: preferences?.archived ?? false,
    };
  }
  async conversations(userId: string, archived = false) {
    return (await this.conversationPage(userId, { archived }, 100)).items;
  }
  async hostPage(userId: string, input: HostConversationPageInput) {
    if (
      !(await this.isHost(
        userId,
        input.organizationId,
        input.branchId,
        this.db,
      ))
    )
      throw new ForbiddenException('Backend.branchAccessDenied');
    await requireBranch(this.db, input.organizationId, input.branchId);
    return this.conversationPage(userId, input, 20, input);
  }
  async conversationPage(
    userId: string,
    input: ConversationPageInput,
    limit = 20,
    scope?: { organizationId: string; branchId: string },
  ) {
    const filter = sql`coalesce(p.archived,false)=${input.archived} AND ${eligible(sql`${userId}::uuid`, sql`o.id`, sql`s.organization_id`, sql`s.branch_id`)} ${scope ? sql`AND s.organization_id=${scope.organizationId} AND s.branch_id=${scope.branchId}` : sql``}`;
    const joins = sql`FROM sport_conversations c JOIN sport_occurrences o ON o.id=c.occurrence_id JOIN sport_services s ON s.id=o.service_id LEFT JOIN sport_conversation_preferences p ON p.conversation_id=c.id AND p.user_id=${userId}`;
    if (
      input.cursor &&
      !(
        await rows(
          this.db,
          sql`SELECT c.id ${joins} WHERE c.id=${input.cursor} AND ${filter}`,
        )
      ).length
    )
      throw new BadRequestException('Backend.invalidConversationCursor');
    const items = await rows<{
      id: string;
      unread: number;
      last_message: string | null;
      closed: boolean;
      revision: number;
      last_message_has_image: boolean | null;
    }>(
      this.db,
      sql`SELECT c.*,coalesce(p.archived,false) archived,
  EXISTS(SELECT 1 FROM organization_members om WHERE om.organization_id=s.organization_id AND om.user_id=${userId} AND om.role IN ('owner','manager') AND (om.role='owner' OR om.all_branches OR EXISTS(SELECT 1 FROM organization_member_branches g WHERE g.member_id=om.id AND g.branch_id=s.branch_id))) host,
  (SELECT count(*)::int FROM sport_messages m WHERE m.conversation_id=c.id AND m.sender_id<>${userId} AND m.deleted_at IS NULL AND (p.read_message_at IS NULL OR (m.created_at,m.id)>(p.read_message_at,p.read_message_id))) unread,
  (SELECT body FROM sport_messages WHERE conversation_id=c.id AND deleted_at IS NULL ORDER BY created_at DESC,id DESC LIMIT 1) last_message,
  (SELECT image_key IS NOT NULL FROM sport_messages WHERE conversation_id=c.id AND deleted_at IS NULL ORDER BY created_at DESC,id DESC LIMIT 1) last_message_has_image
  ${joins}
  WHERE ${filter} ${input.cursor ? sql`AND (c.created_at,c.id)<(SELECT created_at,id FROM sport_conversations WHERE id=${input.cursor})` : sql``} ORDER BY c.created_at DESC,c.id DESC LIMIT ${limit + 1}`,
    );
    return {
      items: items.slice(0, limit),
      nextCursor: items.length > limit ? items[limit - 1].id : null,
    };
  }
  async start(userId: string, occurrenceId: string) {
    return this.db.transaction(async (tx) => {
      await lockWritableAccount(tx, userId);
      const [s] = await rows<{
        title: string;
        organization_id: string;
        branch_id: string;
      }>(
        tx,
        sql`SELECT s.* FROM sport_services s JOIN sport_occurrences o ON o.service_id=s.id WHERE o.id=${occurrenceId}`,
      );
      if (!s) throw new NotFoundException();
      if (
        !(await this.isHost(userId, s.organization_id, s.branch_id, tx, true))
      )
        throw new ForbiddenException('Backend.branchAccessDenied');
      const [conversation] = await rows(
        tx,
        sql`INSERT INTO sport_conversations(occurrence_id,title) VALUES(${occurrenceId},${s.title}) ON CONFLICT(occurrence_id) DO NOTHING RETURNING *`,
      );
      if (conversation) {
        await rows(
          tx,
          sql`INSERT INTO audit_events(actor_id,organization_id,action,target_id,details) VALUES(${userId},${s.organization_id},'sports.conversation.created',${conversation.id},${JSON.stringify({ occurrenceId, branchId: s.branch_id })}::jsonb)`,
        );
        return conversation;
      }
      const [existing] = await rows(
        tx,
        sql`SELECT * FROM sport_conversations WHERE occurrence_id=${occurrenceId}`,
      );
      return existing;
    });
  }
  async messages(
    userId: string,
    id: string,
    before?: string,
    hostOnly = false,
  ) {
    const conversation = await this.access(userId, id);
    if (hostOnly && !conversation.host)
      throw new ForbiddenException('Backend.branchAccessDenied');
    if (
      before &&
      !(
        await rows(
          this.db,
          sql`SELECT id FROM sport_messages WHERE id=${before} AND conversation_id=${id}`,
        )
      ).length
    )
      throw new NotFoundException('Message cursor unavailable');
    const messages = await rows<{
      id: string;
      image_key: string | null;
      read_by_count: number;
    }>(
      this.db,
      sql`SELECT m.id,m.body,m.image_key,m.sender_id,m.created_at,u.display_name,CASE WHEN m.sender_id=${userId} THEN (SELECT count(*)::int FROM sport_conversation_preferences p JOIN users reader ON reader.id=p.user_id WHERE p.conversation_id=m.conversation_id AND p.user_id<>${userId} AND reader.deleted_at IS NULL AND NOT reader.deletion_pending AND reader.status='active' AND (p.read_message_at,p.read_message_id)>=(m.created_at,m.id)) ELSE 0 END read_by_count FROM sport_messages m JOIN users u ON u.id=m.sender_id WHERE m.conversation_id=${id} AND m.deleted_at IS NULL ${before ? sql`AND (m.created_at,m.id)<(SELECT created_at,id FROM sport_messages WHERE id=${before} AND conversation_id=${id})` : sql``} ORDER BY m.created_at DESC,m.id DESC LIMIT 51`,
    );
    return {
      conversation,
      messages: await Promise.all(
        messages
          .slice(0, 50)
          .reverse()
          .map(async (m) => ({
            ...m,
            image_url: m.image_key
              ? (await this.storage.preview(m.image_key)).url
              : null,
            image_key: undefined,
          })),
      ),
      hasMore: messages.length > 50,
    };
  }
  async send(
    userId: string,
    id: string,
    body: string,
    key: string,
    imageInput?: Buffer,
  ) {
    const requestHash = createHash('sha256')
      .update(id)
      .update(body)
      .update(imageInput ?? Buffer.alloc(0))
      .digest('hex');
    const conversation = await this.access(userId, id);
    if (conversation.closed) throw new ConflictException('Conversation closed');
    const previous = await rows<{
      id: string;
      body: string;
      conversation_id: string;
      request_hash: string;
    }>(
      this.db,
      sql`SELECT id,body,conversation_id,request_hash FROM sport_messages WHERE sender_id=${userId} AND idempotency_key=${key}`,
    );
    if (previous[0]) {
      if (
        previous[0].body !== body ||
        previous[0].conversation_id !== id ||
        (previous[0].request_hash && previous[0].request_hash !== requestHash)
      )
        throw new ConflictException('Message key reused');
      return previous[0];
    }
    const [rate] = await rows<{ count: number }>(
      this.db,
      sql`SELECT count(*)::int count FROM sport_messages WHERE sender_id=${userId} AND created_at>now()-interval '1 minute'`,
    );
    if (rate.count >= 30)
      throw new ConflictException('Please wait before sending more messages');
    let imageKey: string | null = null;
    if (imageInput) {
      const input = imageInput;
      if (input.length > 5 * 1024 * 1024)
        throw new ConflictException('Image too large');
      const image = await sharp(input, { limitInputPixels: 20000000 })
        .rotate()
        .resize({
          width: 1600,
          height: 1600,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp()
        .toBuffer()
        .catch(() => {
          throw new BadRequestException('Backend.invalidInput');
        });
      imageKey = `sports/chat/${id}/${userId}/${randomUUID()}.webp`;
      await this.storage.put(imageKey, image, 'image/webp');
    }
    return this.db.transaction(async (tx) => {
      await lockWritableAccount(tx, userId);
      // Serialize the sender without taking an exclusive account lock that
      // would deadlock when two members notify one another concurrently.
      await rows(
        tx,
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${`sports-message-sender:${userId}`},0))`,
      );
      const access = await this.access(userId, id, tx, 'share');
      if (access.closed) throw new ConflictException('Conversation closed');
      const existing = await rows<{ id: string; request_hash: string }>(
        tx,
        sql`SELECT id,request_hash FROM sport_messages WHERE sender_id=${userId} AND idempotency_key=${key}`,
      );
      if (existing[0]) {
        if (existing[0].request_hash !== requestHash)
          throw new ConflictException('Message key reused');
        return existing[0];
      }
      const [rate] = await rows<{ count: number }>(
        tx,
        sql`SELECT count(*)::int count FROM sport_messages WHERE sender_id=${userId} AND created_at>now()-interval '1 minute'`,
      );
      if (rate.count >= 30)
        throw new ConflictException('Please wait before sending more messages');
      const [message] = await rows<{ id: string }>(
        tx,
        sql`INSERT INTO sport_messages(conversation_id,sender_id,body,image_key,idempotency_key,request_hash) VALUES(${id},${userId},${body},${imageKey},${key},${requestHash}) RETURNING id,body,sender_id,created_at`,
      );
      const recipients = await rows<{ user_id: string }>(
        tx,
        sql`SELECT DISTINCT r.user_id FROM sport_reservations r LEFT JOIN sport_notification_preferences p ON p.user_id=r.user_id WHERE r.occurrence_id=${access.occurrence_id} AND r.status IN ('confirmed','completed') AND r.user_id<>${userId} AND coalesce(p.messages,true)`,
      );
      for (const r of recipients)
        await deliverSportsNotification(tx, {
          userId: r.user_id,
          title: 'پیام تازه در گفتگوی کلاس',
          body: access.title,
          href: `/messages/conversation?id=${id}`,
          sourceKey: `message:${message.id}:${r.user_id}`,
          preference: 'messages',
        });
      return message;
    });
  }
  async preferences(
    userId: string,
    id: string,
    input: ConversationPreferencesInput,
  ) {
    return this.db.transaction(async (tx) => {
      await lockWritableAccount(tx, userId);
      await this.access(userId, id, tx, 'share');
      if (input.readMessageId) {
        // PostgreSQL retains microsecond precision; requests cannot move a watermark backwards.
        const advances = sql`(p.read_message_at IS NULL OR (EXCLUDED.read_message_at,EXCLUDED.read_message_id)>(p.read_message_at,p.read_message_id))`;
        const result = await rows(
          tx,
          sql`INSERT INTO sport_conversation_preferences AS p(user_id,conversation_id,archived,read_message_at,read_message_id,read_at)
          SELECT ${userId},${id},${input.archived ?? false},m.created_at,m.id,now() FROM sport_messages m WHERE m.id=${input.readMessageId} AND m.conversation_id=${id}
          ON CONFLICT(user_id,conversation_id) DO UPDATE SET
            archived=${input.archived === undefined ? sql`p.archived` : sql`EXCLUDED.archived`},
            read_message_at=CASE WHEN ${advances} THEN EXCLUDED.read_message_at ELSE p.read_message_at END,
            read_message_id=CASE WHEN ${advances} THEN EXCLUDED.read_message_id ELSE p.read_message_id END,
            read_at=CASE WHEN ${advances} THEN now() ELSE p.read_at END RETURNING user_id`,
        );
        if (!result.length) throw new NotFoundException('Message unavailable');
      } else if (input.archived !== undefined) {
        await rows(
          tx,
          sql`INSERT INTO sport_conversation_preferences(user_id,conversation_id,archived) VALUES(${userId},${id},${input.archived}) ON CONFLICT(user_id,conversation_id) DO UPDATE SET archived=EXCLUDED.archived`,
        );
      }
      return { ok: true };
    });
  }
  async moderate(userId: string, id: string, input: ConversationStateInput) {
    return this.db.transaction(async (tx) => {
      await lockWritableAccount(tx, userId);
      const access = await this.access(userId, id, tx, 'update');
      if (!access.host) throw new ForbiddenException();
      const command = `conversation-state:${input.idempotencyKey}`;
      await rows(
        tx,
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${userId}:${command}`},0))`,
      );
      const hash = createHash('sha256')
        .update(JSON.stringify({ id, ...input }))
        .digest('hex');
      const [receipt] = await rows<{
        request_hash: string;
        result: { closed: boolean; revision: number };
      }>(
        tx,
        sql`SELECT request_hash,result FROM sport_command_receipts WHERE user_id=${userId} AND command_key=${command}`,
      );
      if (receipt) {
        if (receipt.request_hash !== hash)
          throw new ConflictException('Backend.conversationKeyReused');
        return receipt.result;
      }
      if (access.revision !== input.revision)
        throw new ConflictException('Backend.conversationChanged');
      const [changed] = await rows<{ closed: boolean; revision: number }>(
        tx,
        sql`UPDATE sport_conversations SET closed=${input.closed},revision=revision+1 WHERE id=${id} RETURNING closed,revision`,
      );
      await rows(
        tx,
        sql`INSERT INTO audit_events(actor_id,organization_id,action,target_id,details) VALUES(${userId},${access.organization_id},'sports.conversation.state_changed',${id},${JSON.stringify({ branchId: access.branch_id, closed: input.closed, revision: changed.revision, reason: input.reason })}::jsonb)`,
      );
      await rows(
        tx,
        sql`INSERT INTO sport_command_receipts(user_id,command_key,request_hash,result) VALUES(${userId},${command},${hash},${JSON.stringify(jsonDto(changed))}::jsonb)`,
      );
      return changed;
    });
  }
  async reportMessage(
    userId: string,
    id: string,
    messageId: string,
    reason: string,
  ) {
    return this.db.transaction(async (tx) => {
      await lockWritableAccount(tx, userId);
      await this.access(userId, id, tx, 'share');
      const message = await rows(
        tx,
        sql`SELECT id FROM sport_messages WHERE id=${messageId} AND conversation_id=${id} AND deleted_at IS NULL FOR SHARE`,
      );
      if (!message.length) throw new NotFoundException();
      await rows(
        tx,
        sql`INSERT INTO sport_message_reports(user_id,message_id,reason) VALUES(${userId},${messageId},${reason}) ON CONFLICT DO NOTHING`,
      );
      return { ok: true };
    });
  }
}
