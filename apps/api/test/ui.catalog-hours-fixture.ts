import { eq } from 'drizzle-orm';
import type { DatabaseService } from '../src/database/database.service';
import * as s from '../src/database/schema';

/** Owned catalog branch only; parent fixture cleanup cascades these rows. */
export async function seedCatalogHours(
  db: DatabaseService['db'],
  branchId: string,
) {
  await db.transaction(async (tx) => {
    await tx.delete(s.weeklyHours).where(eq(s.weeklyHours.branchId, branchId));
    await tx.insert(s.weeklyHours).values([
      {
        branchId,
        dayOfWeek: 0,
        audience: 'women',
        startMinute: 480,
        endMinute: 720,
      },
      {
        branchId,
        dayOfWeek: 0,
        audience: 'men',
        startMinute: 1320,
        endMinute: 1440,
      },
    ]);
    await tx.insert(s.openingExceptions).values({
      branchId,
      date: '2026-10-20',
      audience: 'women',
      isClosed: true,
      reason: 'تعطیلی ویژهٔ بانوان برای بررسی رابط',
    });
    const [exception] = await tx
      .insert(s.openingExceptions)
      .values({
        branchId,
        date: '2026-10-20',
        audience: 'men',
        isClosed: false,
        reason: 'سانس شبانهٔ آزمایشی',
      })
      .returning();
    await tx.insert(s.exceptionIntervals).values({
      exceptionId: exception.id,
      startMinute: 1380,
      endMinute: 1500,
    });
    await tx
      .update(s.branchProfiles)
      .set({ updatedAt: new Date('2026-10-19T09:00:00Z') })
      .where(eq(s.branchProfiles.branchId, branchId));
  });
}
