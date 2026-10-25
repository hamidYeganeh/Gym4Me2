import { ConflictException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { Tx } from '../clubs/club.repository';
import { rows } from '../commerce/commerce.service';
export async function lockRefundCredit(tx: Tx, orderId: string) {
  const [source] = await rows<{
    network_id: string;
    user_id: string;
    organization_id: string;
  }>(
    tx,
    sql`SELECT network_id,user_id,organization_id FROM credit_entries WHERE order_id=${orderId} AND kind='spend'`,
  );
  if (!source) throw new ConflictException('Growth.creditNotFound');
  await tx.execute(
    sql`SELECT balance_minor FROM credit_accounts WHERE network_id=${source.network_id} AND user_id=${source.user_id} FOR UPDATE`,
  );
  return source;
}
export async function refundCredit(
  tx: Tx,
  source: Awaited<ReturnType<typeof lockRefundCredit>>,
  orderId: string,
  refundId: string,
  amount: string,
) {
  const [entry] = await rows(
    tx,
    sql`INSERT INTO credit_entries(network_id,user_id,organization_id,delta_minor,kind,order_id,source_key,actor_id) VALUES(${source.network_id},${source.user_id},${source.organization_id},${amount},'refund',${orderId},${`credit-refund:${refundId}`},${source.user_id}) ON CONFLICT(source_key) DO NOTHING RETURNING id`,
  );
  if (entry)
    await tx.execute(
      sql`UPDATE credit_accounts SET balance_minor=balance_minor+${amount} WHERE network_id=${source.network_id} AND user_id=${source.user_id}`,
    );
}
