import { ConflictException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { Db, Tx } from '../clubs/club.repository';
import { lockWritableAccount } from '../auth/account-lock';
import { rows } from './commerce.service';

export function supportCommand<T>(
  db: Db,
  actor: string,
  key: string | undefined,
  input: unknown,
  authorize: (tx: Tx) => Promise<unknown>,
  work: (tx: Tx) => Promise<T>,
) {
  return db.transaction(async (tx) => {
    await lockWritableAccount(tx, actor);
    await authorize(tx);
    if (!key) return work(tx);
    const command = `support:${key}`;
    const fingerprint = createHash('sha256')
      .update(JSON.stringify(input))
      .digest('hex');
    const [old] = await rows<{ request_hash: string; result: T }>(
      tx,
      sql`SELECT request_hash,result FROM sport_command_receipts WHERE user_id=${actor} AND command_key=${command}`,
    );
    if (old) {
      if (old.request_hash !== fingerprint)
        throw new ConflictException('Workflow.keyReused');
      return old.result;
    }
    const result = await work(tx);
    await tx.execute(
      sql`INSERT INTO sport_command_receipts(user_id,command_key,request_hash,result) VALUES(${actor},${command},${fingerprint},${JSON.stringify(result)}::jsonb)`,
    );
    return result;
  });
}
