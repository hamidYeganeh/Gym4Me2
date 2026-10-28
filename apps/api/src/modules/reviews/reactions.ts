import {
  Body,
  Get,
  Injectable,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { DatabaseService } from '../../database/database.service';
import { DomainController } from '../../platform/http/domain-controller.decorator';
import { ClientHeader } from '../auth/auth.contracts';
import { AuthGuard, ClientGuard, type AuthRequest } from '../auth/auth.guard';
import { id, SchemaBody, validate } from '../clubs/club.contracts';
import { rows } from '../commerce/commerce.service';
import { ConsentGuard } from '../profile/consent.guard';

export const reactionSchema = z
  .object({
    emoji: z.enum(['👍', '❤️', '😂', '😮', '😢', '🙏']),
    active: z.boolean(),
  })
  .strict();
const kindSchema = z.enum(['club', 'coach']);
type Kind = z.infer<typeof kindSchema>;

@Injectable()
export class ReviewReactionsService {
  constructor(private readonly database: DatabaseService) {}
  private async visible(
    db: typeof this.database.db,
    kind: Kind,
    reviewId: string,
  ) {
    const found =
      kind === 'club'
        ? await rows(
            db,
            sql`SELECT id FROM club_reviews WHERE id=${reviewId} AND status='published' FOR SHARE`,
          )
        : await rows(
            db,
            sql`SELECT cr.id FROM coaching_reviews cr JOIN sport_reservations r ON r.id=cr.reservation_id WHERE cr.id=${reviewId} AND cr.published AND NOT cr.hidden AND r.status='completed' FOR SHARE OF cr`,
          );
    if (!found.length) throw new NotFoundException('Backend.reviewNotFound');
  }
  async list(kind: Kind, reviewId: string, actor?: string) {
    await this.visible(this.database.db, kind, reviewId);
    const table = sql.identifier(
      kind === 'club' ? 'club_review_reactions' : 'coach_review_reactions',
    );
    return rows(
      this.database.db,
      sql`SELECT emoji, count(*)::int AS count, coalesce(bool_or(user_id=${actor ?? null}::uuid),false) AS mine FROM ${table} WHERE review_id=${reviewId} GROUP BY emoji ORDER BY emoji`,
    );
  }
  async set(
    kind: Kind,
    reviewId: string,
    actor: string,
    input: z.infer<typeof reactionSchema>,
  ) {
    // Reactions are open to every signed-in user, independently of review eligibility.
    // A unique user/review/emoji key makes retries idempotent and counts authoritative.
    await this.database.db.transaction(async (tx) => {
      await this.visible(tx, kind, reviewId);
      const table = sql.identifier(
        kind === 'club' ? 'club_review_reactions' : 'coach_review_reactions',
      );
      if (input.active)
        await tx.execute(
          sql`INSERT INTO ${table}(review_id,user_id,emoji) VALUES(${reviewId},${actor},${input.emoji}) ON CONFLICT DO NOTHING`,
        );
      else
        await tx.execute(
          sql`DELETE FROM ${table} WHERE review_id=${reviewId} AND user_id=${actor} AND emoji=${input.emoji}`,
        );
    });
    return this.list(kind, reviewId, actor);
  }
}

@DomainController('catalog', 'reviews')
export class ReviewReactionsController {
  constructor(private readonly service: ReviewReactionsService) {}
  @Get(':kind/:id/reactions') list(
    @Param('kind') kind: string,
    @Param('id') value: string,
  ) {
    return this.service.list(validate(kindSchema, kind), validate(id, value));
  }
  @Get(':kind/:id/reactions/mine')
  @ClientHeader()
  @UseGuards(ClientGuard, AuthGuard, ConsentGuard)
  mine(
    @Param('kind') kind: string,
    @Param('id') value: string,
    @Req() req: AuthRequest,
  ) {
    return this.service.list(
      validate(kindSchema, kind),
      validate(id, value),
      req.principal.user.id,
    );
  }
  @Post(':kind/:id/reactions')
  @ClientHeader()
  @UseGuards(ClientGuard, AuthGuard, ConsentGuard)
  @SchemaBody(reactionSchema)
  set(
    @Param('kind') kind: string,
    @Param('id') value: string,
    @Req() req: AuthRequest,
    @Body() body: unknown,
  ) {
    return this.service.set(
      validate(kindSchema, kind),
      validate(id, value),
      req.principal.user.id,
      validate(reactionSchema, body),
    );
  }
}
