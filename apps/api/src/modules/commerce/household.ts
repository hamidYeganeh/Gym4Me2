import { NotFoundException, BadRequestException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { Db, Tx } from '../clubs/club.repository';
export type Dependent = {
  id: string;
  name: string;
  birthDate: string;
  gender: 'male' | 'female' | 'unspecified';
  revision: number;
};
export async function purchaseDependent(
  db: Db | Tx,
  guardian: string,
  dependentId?: string,
  quantity = 1,
): Promise<Dependent | null> {
  if (!dependentId) return null;
  if (quantity !== 1)
    throw new BadRequestException('Closure.dependentQuantity');
  const result = await db.execute(
    sql`SELECT id,name,birth_date::text AS "birthDate",gender,revision FROM sport_dependents WHERE id=${dependentId} AND guardian_id=${guardian} AND status='active'`,
  );
  const row = result.rows[0];
  if (!row) throw new NotFoundException('Closure.dependentUnavailable');
  return row as Dependent;
}
