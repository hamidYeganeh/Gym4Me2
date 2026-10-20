import { eq } from 'drizzle-orm';
import type { DatabaseService } from '../src/database/database.service';
import * as s from '../src/database/schema';

/** Empty geographic scopes make a dropped country/province filter visibly fail. */
export async function seedEmptyGeography(
  db: DatabaseService['db'],
  countryId: string,
) {
  const owned = await db.transaction(async (tx) => {
    const used = new Set(
      (await tx.select({ code: s.countries.code }).from(s.countries)).map(
        (row) => row.code,
      ),
    );
    let code: string | undefined;
    for (let index = 0; index < 676; index++) {
      const candidate = String.fromCharCode(
        65 + Math.floor(index / 26),
        65 + (index % 26),
      );
      if (!used.has(candidate)) {
        code = candidate;
        break;
      }
    }
    if (!code) throw new Error('No unused fixture country code');
    const [country] = await tx
      .insert(s.countries)
      .values({ code, name: 'کشور بدون مجموعهٔ آزمایشی' })
      .returning();
    const [province] = await tx
      .insert(s.provinces)
      .values({ countryId, name: 'استان بدون مجموعهٔ آزمایشی' })
      .returning();
    return { emptyCountryId: country.id, emptyProvinceId: province.id };
  });
  return {
    ...owned,
    cleanup: async () => {
      await db
        .delete(s.provinces)
        .where(eq(s.provinces.id, owned.emptyProvinceId));
      await db
        .delete(s.countries)
        .where(eq(s.countries.id, owned.emptyCountryId));
    },
  };
}
