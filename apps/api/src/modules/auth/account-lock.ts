import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { users } from '../../database/schema';
import type { Tx } from '../clubs/club.repository';

// Retention uses FOR UPDATE on this row. Writers recheck identity while holding
// a shared lock so a request authenticated before deletion cannot recreate data.
export async function lockWritableAccount(
  tx: Tx,
  userId: string,
  mode: 'share' | 'update' = 'share',
) {
  const [user] = await tx
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .for(mode);
  if (!user || user.status !== 'active' || user.deletedAt)
    throw new UnauthorizedException('Backend.theSessionHasEndedSignInAgain');
  if (user.deletionPending)
    throw new ConflictException('Backend.accountDeletionPending');
  return user;
}
