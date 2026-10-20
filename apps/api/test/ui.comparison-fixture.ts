import type { DatabaseService } from '../src/database/database.service';
import * as s from '../src/database/schema';

/** Extra, disposable terms for the real comparison screen; owned by seedUiCatalog cleanup. */
export async function seedComparisonTariffs(
  db: DatabaseService['db'],
  catalog: {
    clubs: { id: string; branches: string[] }[];
    people: { id: string }[];
  },
) {
  const commonConditions = 'کارت غیرقابل انتقال؛ فقط تمرین عمومی.';
  const plans = [
    { club: 0, name: 'تعریف برابر آفتاب', priceToman: 1200000 },
    { club: 1, name: 'تعریف برابر سپیدار', priceToman: 1500000 },
    {
      club: 0,
      name: 'اعتبار کوتاه ارزان',
      priceToman: 100000,
      durationDays: 10,
    },
    {
      club: 1,
      name: 'جلسات بیشتر ارزان',
      priceToman: 200000,
      sessionCount: 12,
    },
    {
      club: 0,
      name: 'شرط انتقال متفاوت',
      priceToman: 250000,
      conditions: 'کارت قابل انتقال؛ فقط تمرین عمومی.',
    },
    { club: 0, name: 'همه شعب رایگان', priceToman: 0, allBranches: true },
    {
      club: 0,
      name: 'خدمات کمتر',
      priceToman: 50000,
      includedServices: ['سالن'],
    },
  ];
  await db.transaction(async (tx) => {
    for (const plan of plans) {
      const [group] = await tx
        .insert(s.tariffGroups)
        .values({
          clubId: catalog.clubs[plan.club].id,
          branchId:
            'allBranches' in plan ? null : catalog.clubs[plan.club].branches[1],
        })
        .returning();
      await tx.insert(s.tariffVersions).values({
        groupId: group.id,
        createdBy: catalog.people[plan.club].id,
        version: 1,
        name: plan.name,
        priceToman: plan.priceToman,
        serviceType: 'membership',
        unit: 'month',
        durationDays: 'durationDays' in plan ? plan.durationDays : 30,
        sessionCount: 'sessionCount' in plan ? plan.sessionCount : 8,
        includedServices:
          'includedServices' in plan
            ? plan.includedServices
            : ['سالن', 'رختکن'],
        conditions: plan.conditions ?? commonConditions,
        effectiveFrom: new Date(Date.now() - 60000),
      });
    }
  });
  return { commonConditions, labels: plans.map((plan) => plan.name) };
}
