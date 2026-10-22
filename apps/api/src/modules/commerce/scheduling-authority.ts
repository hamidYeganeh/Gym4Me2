import { ForbiddenException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { Principal } from '../auth/auth.service';
import type { Db, Tx } from '../clubs/club.repository';

/** Authority comes from the authenticated administrator, never a body flag. */
export async function assertSchedulingAdmin(
  db: Db | Tx,
  principal: Principal,
  actorId = principal.user.id,
) {
  if (principal.session.client !== 'admin' || principal.user.id !== actorId)
    throw new ForbiddenException(
      'Backend.thisAccountDoesNotHaveAdministratorAccess',
    );
  const result = await db.execute(
    sql`SELECT a.user_id FROM platform_admins a JOIN users u ON u.id=a.user_id WHERE a.user_id=${actorId} AND u.status='active' AND u.deleted_at IS NULL AND NOT u.deletion_pending`,
  );
  if (!result.rows.length)
    throw new ForbiddenException(
      'Backend.thisAccountDoesNotHaveAdministratorAccess',
    );
}
