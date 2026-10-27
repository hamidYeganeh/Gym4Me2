import { Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import type { Tx } from '../clubs/club.repository';
import { CommerceService, rows } from './commerce.service';

/** Legacy payment obligations only. V1 cannot create games or claim new shares. */
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
export class LegacyGroupReconciliationService {
  private readonly logger = new Logger(LegacyGroupReconciliationService.name);
  constructor(
    private readonly database: DatabaseService,
    private readonly commerce: CommerceService,
  ) {}
  private get db() {
    return this.database.db;
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
      sql`SELECT g.id FROM growth_games g JOIN sport_orders o ON o.id=g.order_id WHERE (g.status='recruiting' AND (g.deadline<=now() OR o.status<>'awaiting_payment' OR NOT EXISTS(SELECT 1 FROM growth_game_shares sh LEFT JOIN sport_orders child ON child.id=sh.order_id WHERE sh.game_id=g.id AND (sh.user_id IS NULL OR coalesce(child.status,'')<>'paid')))) OR (g.status='confirmed' AND o.status IN ('cancelled','refunded','partially_refunded','review')) ORDER BY g.deadline,g.id LIMIT 25`,
    );
    for (const g of due) {
      try {
        await this.reconcile(g.id);
      } catch {
        this.logger.warn('Group reconciliation failed; it will be retried.');
      }
    }
  }
}
