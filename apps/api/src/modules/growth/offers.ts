import { ConflictException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { Db, Tx } from '../clubs/club.repository';
import { rows } from '../commerce/commerce.service';
export async function offerPrice(
  db: Db | Tx,
  occurrenceId: string | undefined,
  amount: string,
  lock = false,
) {
  if (!occurrenceId) return { amount, offerId: null };
  const [offer] = await rows<{
    id: string;
    discount_basis_points: number;
    max_uses: number;
  }>(
    db,
    sql`SELECT g.id,g.discount_basis_points,g.max_uses FROM growth_offers g JOIN sport_occurrences o ON o.id=g.occurrence_id JOIN sport_services s ON s.id=o.service_id WHERE g.occurrence_id=${occurrenceId} AND g.active AND g.ends_at>clock_timestamp() AND o.start_at>clock_timestamp() AND s.kind IN ('class','court','access') ${lock ? sql`FOR UPDATE OF g` : sql``}`,
  );
  if (!offer) return { amount, offerId: null };
  const [usage] = await rows<{ count: number }>(
    db,
    sql`SELECT count(*)::int count FROM sport_orders WHERE snapshot->>'offerId'=${offer.id} AND status NOT IN ('cancelled','refunded')`,
  );
  if (usage.count >= offer.max_uses) return { amount, offerId: null };
  const discounted =
    BigInt(amount) -
    (BigInt(amount) * BigInt(offer.discount_basis_points)) / 10000n;
  if (discounted <= 0n) throw new ConflictException('Growth.invalidOffer');
  return { amount: discounted.toString(), offerId: offer.id };
}
