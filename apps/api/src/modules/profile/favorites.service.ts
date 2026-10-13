import { lockWritableAccount } from '../auth/account-lock';
import { BadRequestException, Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import * as s from '../../database/schema';
import { publicClub } from '../clubs/club.read-model';
@Injectable()
export class FavoritesService {
  constructor(private readonly database: DatabaseService) {}
  async list(userId: string) {
    return (
      await this.database.db
        .select({ id: s.favoriteClubs.clubId })
        .from(s.favoriteClubs)
        .where(eq(s.favoriteClubs.userId, userId))
        .orderBy(s.favoriteClubs.createdAt, s.favoriteClubs.clubId)
    ).map((row) => row.id);
  }
  async set(userId: string, id: string, saved: boolean) {
    if (saved) await this.merge(userId, [id]);
    else
      await this.database.db.transaction(async (tx) => {
        await lockWritableAccount(tx, userId, 'update');
        await tx
          .delete(s.favoriteClubs)
          .where(
            and(
              eq(s.favoriteClubs.userId, userId),
              eq(s.favoriteClubs.clubId, id),
            ),
          );
      });
    return this.list(userId);
  }
  async merge(userId: string, ids: string[]) {
    if (!ids.length) return this.list(userId);
    await this.database.db.transaction(async (tx) => {
      await lockWritableAccount(tx, userId, 'update');
      const found = await tx
        .select({ id: s.clubs.id })
        .from(s.clubs)
        .innerJoin(s.organizations, eq(s.organizations.id, s.clubs.id))
        .where(and(publicClub(), inArray(s.clubs.id, ids)));
      const existing = await tx
        .select({ id: s.favoriteClubs.clubId })
        .from(s.favoriteClubs)
        .where(eq(s.favoriteClubs.userId, userId));
      const added = found.filter(
        (club) => !existing.some((row) => row.id === club.id),
      );
      if (existing.length + added.length > 500)
        throw new BadRequestException('Backend.favoriteLimit');
      if (added.length)
        await tx
          .insert(s.favoriteClubs)
          .values(added.map((club) => ({ userId, clubId: club.id })))
          .onConflictDoNothing();
    });
    return this.list(userId);
  }
}
