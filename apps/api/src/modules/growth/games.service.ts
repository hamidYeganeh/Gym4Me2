import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID, createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { DatabaseService } from '../../database/database.service';
import type { Tx } from '../clubs/club.repository';
import { trainingCommand } from '../training/training.service';
import { CommerceService, rows } from '../commerce/commerce.service';
import { publicServiceVisible } from '../commerce/public-service';
export const createGame = z
  .object({
    operationId: z.uuid(),
    serviceId: z.uuid(),
    occurrenceId: z.uuid(),
    title: z.string().trim().min(2).max(160),
    playerCount: z.number().int().min(2).max(12),
    public: z.boolean(),
    acceptedTerms: z.literal(true),
  })
  .strict();
export const gameCommand = z
  .object({ operationId: z.uuid(), acceptedTerms: z.literal(true) })
  .strict();
type Game = {
  id: string;
  organizer_id: string;
  order_id: string;
  occurrence_id: string;
  status: string;
  deadline: Date;
  public: boolean;
  player_count: number;
  title: string;
};
@Injectable()
export class GamesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly commerce: CommerceService,
  ) {}
  private get db() {
    return this.database.db;
  }
  async publicList() {
    return rows(
      this.db,
      sql`SELECT g.id,g.title,g.player_count,g.deadline,o.start_at,o.end_at,b.name branch_name,(SELECT count(*)::int FROM growth_game_shares x WHERE x.game_id=g.id AND x.user_id IS NOT NULL) joined FROM growth_games g JOIN sport_orders ord ON ord.id=g.order_id JOIN sport_occurrences o ON o.id=g.occurrence_id JOIN sport_services s ON s.id=o.service_id JOIN sport_service_versions v ON v.id=s.published_version_id JOIN branches b ON b.id=s.branch_id WHERE g.public AND g.status='recruiting' AND g.deadline>now() AND ord.status='awaiting_payment' AND o.status='scheduled' AND ${publicServiceVisible} ORDER BY g.deadline,g.id LIMIT 50`,
    );
  }
  async mine(actor: string) {
    return rows(
      this.db,
      sql`SELECT DISTINCT g.id,g.title,g.status,g.deadline,g.player_count,g.organizer_id=${actor} organizer FROM growth_games g LEFT JOIN growth_game_shares sh ON sh.game_id=g.id WHERE g.organizer_id=${actor} OR sh.user_id=${actor} ORDER BY g.deadline DESC,g.id LIMIT 100`,
    );
  }
  async detail(actor: string, id: string) {
    const [g] = await rows<Game>(
      this.db,
      sql`SELECT g.*,o.start_at,o.end_at,ord.snapshot->>'title' service_title,s.id service_id,b.name branch_name,ord.snapshot->'policy' policy,(SELECT status FROM sport_reservations r WHERE r.order_id=ord.id ORDER BY r.created_at DESC LIMIT 1) booking_state FROM growth_games g JOIN sport_occurrences o ON o.id=g.occurrence_id JOIN sport_orders ord ON ord.id=g.order_id JOIN sport_services s ON s.id=ord.service_id JOIN branches b ON b.id=s.branch_id WHERE g.id=${id}`,
    );
    if (!g) throw new NotFoundException('Growth.notFound');
    const own = await rows<{
      id: string;
      order_id: string;
      amount_minor: string;
    }>(
      this.db,
      sql`SELECT id,order_id,amount_minor::text FROM growth_game_shares WHERE game_id=${id} AND user_id=${actor}`,
    );
    const shares = await rows(
      this.db,
      sql`SELECT sh.slot,sh.amount_minor::text,sh.user_id IS NOT NULL joined,coalesce(o.status,'unclaimed') status FROM growth_game_shares sh LEFT JOIN sport_orders o ON o.id=sh.order_id WHERE sh.game_id=${id} ORDER BY sh.slot`,
    );
    return {
      id: g.id,
      title: g.title,
      serviceId: (g as Game & { service_id: string }).service_id,
      serviceTitle: (g as Game & { service_title: string }).service_title,
      branchName: (g as Game & { branch_name: string }).branch_name,
      status: g.status,
      deadline: g.deadline,
      playerCount: g.player_count,
      bookingState: (g as Game & { booking_state: string | null })
        .booking_state,
      organizer: g.organizer_id === actor,
      startAt: (g as Game & { start_at: Date }).start_at,
      policy: (g as Game & { policy: unknown }).policy,
      ownShare: own[0] ?? null,
      shares,
    };
  }
  async create(actor: string, input: z.infer<typeof createGame>) {
    return trainingCommand(
      this.db,
      actor,
      input.operationId,
      ['game.create', input],
      async (tx) => {
        const [service] = await rows<{ kind: string }>(
          tx,
          sql`SELECT kind FROM sport_services WHERE id=${input.serviceId}`,
        );
        if (service?.kind !== 'court')
          throw new ConflictException('Growth.gameCourtOnly');
        const order = await this.commerce.checkout(
          actor,
          {
            serviceId: input.serviceId,
            occurrenceId: input.occurrenceId,
            idempotencyKey: `game-${input.operationId}`,
          },
          'online',
          true,
          tx,
        );
        if (BigInt(String(order.amount_minor)) < BigInt(input.playerCount))
          throw new ConflictException('Growth.invalidGamePrice');
        const gameId = randomUUID();
        await tx.execute(
          sql`INSERT INTO growth_games(id,organizer_id,order_id,occurrence_id,title,player_count,deadline,public) VALUES(${gameId},${actor},${order.id},${input.occurrenceId},${input.title},${input.playerCount},${order.expires_at},${input.public})`,
        );
        await tx.execute(
          sql`UPDATE sport_orders SET snapshot=snapshot||${JSON.stringify({ groupId: gameId })}::jsonb WHERE id=${order.id}`,
        );
        const total = BigInt(String(order.amount_minor)),
          each = total / BigInt(input.playerCount);
        for (let i = 1; i <= input.playerCount; i++)
          await tx.execute(
            sql`INSERT INTO growth_game_shares(game_id,slot,amount_minor) VALUES(${gameId},${i},${(i === 1 ? total - each * BigInt(input.playerCount - 1) : each).toString()})`,
          );
        await this.claim(tx, actor, gameId);
        return { id: gameId };
      },
    );
  }
  private async claim(tx: Tx, actor: string, id: string) {
    const [game] = await rows<Game>(
      tx,
      sql`SELECT * FROM growth_games WHERE id=${id} FOR UPDATE`,
    );
    if (!game) throw new NotFoundException('Growth.notFound');
    const [old] = await rows<{ order_id: string }>(
      tx,
      sql`SELECT order_id FROM growth_game_shares WHERE game_id=${id} AND user_id=${actor}`,
    );
    if (old) return { orderId: old.order_id };
    const [valid] = await rows<{
      id: string;
      service_id: string;
      version_id: string;
    }>(
      tx,
      sql`SELECT ord.id,ord.service_id,ord.version_id FROM sport_orders ord JOIN sport_occurrences o ON o.id=${game.occurrence_id} WHERE ord.id=${game.order_id} AND ord.status='awaiting_payment' AND ord.expires_at>clock_timestamp() AND o.status='scheduled' AND o.start_at>clock_timestamp()`,
    );
    if (
      !valid ||
      game.status !== 'recruiting' ||
      new Date(game.deadline) <= new Date()
    )
      throw new ConflictException('Growth.gameUnavailable');
    await this.commerce.checkParticipant(
      tx,
      actor,
      valid.service_id,
      valid.version_id,
    );
    const [share] = await rows<{ id: string; amount_minor: string }>(
      tx,
      sql`SELECT id,amount_minor::text FROM growth_game_shares WHERE game_id=${id} AND user_id IS NULL ORDER BY slot LIMIT 1 FOR UPDATE`,
    );
    if (!share) throw new ConflictException('Growth.gameFull');
    const [order] = await rows<{ id: string }>(
      tx,
      sql`INSERT INTO sport_orders(user_id,organization_id,service_id,version_id,amount_minor,snapshot,idempotency_key,request_hash,expires_at) SELECT ${actor},organization_id,service_id,version_id,${share.amount_minor},snapshot||${JSON.stringify({ kind: 'split_share', groupId: id, approvalRequired: false })}::jsonb,${`share:${share.id}`},${createHash(
        'sha256',
      )
        .update(share.id + actor)
        .digest(
          'hex',
        )},${game.deadline} FROM sport_orders WHERE id=${game.order_id} RETURNING id`,
    );
    await tx.execute(
      sql`UPDATE growth_game_shares SET user_id=${actor},order_id=${order.id} WHERE id=${share.id}`,
    );
    return { orderId: order.id };
  }
  async join(actor: string, id: string, input: z.infer<typeof gameCommand>) {
    return trainingCommand(
      this.db,
      actor,
      input.operationId,
      ['game.join', id, input],
      (tx) => this.claim(tx, actor, id),
    );
  }
  async cancel(actor: string, id: string, input: z.infer<typeof gameCommand>) {
    return trainingCommand(
      this.db,
      actor,
      input.operationId,
      ['game.cancel', id, input],
      async (tx) => {
        const [g] = await rows<Game>(
          tx,
          sql`SELECT * FROM growth_games WHERE id=${id} FOR UPDATE`,
        );
        if (!g || g.organizer_id !== actor)
          throw new ForbiddenException('Growth.denied');
        if (g.status === 'recruiting') {
          await this.commerce.cancelInternalParent(
            tx,
            g.order_id,
            'Organizer cancelled group',
          );
          await this.close(tx, g);
        } else if (g.status === 'confirmed') {
          await this.commerce.cancelInternalParent(
            tx,
            g.order_id,
            'Organizer cancelled group',
            false,
          );
          await tx.execute(
            sql`UPDATE growth_games SET status='cancelled' WHERE id=${id}`,
          );
        }
        return { id };
      },
    );
  }
  private async close(tx: Tx, g: Game) {
    const shares = await rows<{ id: string; order_id: string }>(
      tx,
      sql`SELECT id,order_id FROM growth_game_shares WHERE game_id=${g.id} AND order_id IS NOT NULL ORDER BY order_id`,
    );
    for (const share of shares)
      await this.commerce.refundInternalShare(
        tx,
        share.order_id,
        `game-cancel:${g.id}:${share.id}`,
      );
    await tx.execute(
      sql`UPDATE growth_games SET status='cancelled' WHERE id=${g.id}`,
    );
  }
  async reconcile(id: string) {
    return this.db.transaction(async (tx) => {
      const [g] = await rows<Game>(
        tx,
        sql`SELECT * FROM growth_games WHERE id=${id} FOR UPDATE`,
      );
      if (!g) return;
      const [order] = await rows<{ status: string }>(
        tx,
        sql`SELECT status FROM sport_orders WHERE id=${g.order_id}`,
      );
      const [session] = await rows<{ status: string }>(
        tx,
        sql`SELECT status FROM sport_occurrences WHERE id=${g.occurrence_id}`,
      );
      if (g.status === 'recruiting') {
        if (
          new Date(g.deadline) <= new Date() ||
          order.status !== 'awaiting_payment' ||
          session.status !== 'scheduled'
        ) {
          await this.commerce.cancelInternalParent(
            tx,
            g.order_id,
            'Group payment deadline or session unavailable',
          );
          await this.close(tx, g);
          return;
        }
        const [paid] = await rows<{ n: number }>(
          tx,
          sql`SELECT count(*)::int n FROM growth_game_shares sh JOIN sport_orders o ON o.id=sh.order_id WHERE sh.game_id=${id} AND o.status='paid'`,
        );
        if (paid.n === g.player_count) {
          await this.commerce.settleInternalPayment(
            tx,
            g.organizer_id,
            g.order_id,
            'team_split',
            `game:${id}`,
          );
          await tx.execute(
            sql`UPDATE growth_games SET status='confirmed' WHERE id=${id}`,
          );
        }
      } else if (
        g.status === 'confirmed' &&
        ['cancelled', 'refunded', 'partially_refunded', 'review'].includes(
          order.status,
        )
      )
        await tx.execute(
          sql`UPDATE growth_games SET status='cancelled' WHERE id=${id}`,
        );
    });
  }
  async runDue() {
    const due = await rows<{ id: string }>(
      this.db,
      sql`SELECT g.id FROM growth_games g JOIN sport_orders o ON o.id=g.order_id WHERE g.status='recruiting' OR g.status='confirmed' AND o.status IN ('cancelled','refunded','partially_refunded','review') ORDER BY g.deadline,g.id LIMIT 25`,
    );
    for (const g of due) await this.reconcile(g.id);
  }
}
