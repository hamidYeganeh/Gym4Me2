import { eq, inArray } from 'drizzle-orm';
import { randomInt, randomUUID } from 'node:crypto';
import type { DatabaseService } from '../src/database/database.service';
import * as s from '../src/database/schema';

/** Disposable, uniquely owned catalog. Never deletes records by a shared name. */
export async function seedUiCatalog(
  db: DatabaseService['db'],
  applicationOrigin = 'http://127.0.0.1:7081',
  publication = false,
) {
  const suffix = randomUUID().slice(0, 8);
  const seeded = await db.transaction(async (tx) => {
    const people = await tx
      .insert(s.users)
      .values(
        [
          'مالک یک',
          'مالک دو',
          'ورزشکار آزمایشی',
          ...(publication ? ['ادمین بررسی آزمایشی'] : []),
        ].map((name) => ({
          phone: `+9890${randomInt(100000000).toString().padStart(8, '0')}`,
          displayName: name,
          phoneVerifiedAt: new Date(),
          profilePublic: true,
        })),
      )
      .returning();
    if (publication)
      await tx.insert(s.platformAdmins).values({ userId: people[3].id });
    const [equipment] = publication
      ? await tx
          .insert(s.equipments)
          .values({ name: 'تردمیل آزمایشی', slug: `ui-equipment-${suffix}` })
          .returning()
      : [];
    const facilities = publication
      ? await tx
          .insert(s.amenities)
          .values([
            { name: 'رختکن آزمایشی', slug: `ui-included-${suffix}` },
            { name: 'سونای آزمایشی', slug: `ui-paid-${suffix}` },
            { name: 'استخر آزمایشی', slug: `ui-unavailable-${suffix}` },
          ])
          .returning()
      : [];
    const [accessibility] = publication
      ? await tx
          .insert(s.accessibilityFeatures)
          .values({
            name: 'ورودی بدون پلهٔ آزمایشی',
            slug: `ui-accessibility-${suffix}`,
          })
          .returning()
      : [];
    // Pick an unused two-letter fixture code without taking ownership of an existing country.
    const used = new Set(
      (await tx.select({ code: s.countries.code }).from(s.countries)).map(
        (r) => r.code,
      ),
    );
    let code = 'QA';
    for (let n = 0; used.has(code); n++) {
      if (n >= 676) throw new Error('No fixture country code available');
      code = String.fromCharCode(65 + Math.floor(n / 26), 65 + (n % 26));
    }
    const [country] = await tx
      .insert(s.countries)
      .values({ name: 'ایران آزمایشی', code })
      .returning();
    const [province] = await tx
      .insert(s.provinces)
      .values({ countryId: country.id, name: `تهران ${suffix}` })
      .returning();
    const [city] = await tx
      .insert(s.cities)
      .values({ provinceId: province.id, name: 'تهران' })
      .returning();
    const [category] = await tx
      .insert(s.clubCategories)
      .values({ name: 'باشگاه ورزشی', slug: `ui-category-${suffix}` })
      .returning();
    const [sport] = await tx
      .insert(s.sports)
      .values({ name: 'بدنسازی', slug: `ui-sport-${suffix}` })
      .returning();
    const clubs: { id: string; branches: string[] }[] = [];
    for (let index = 0; index < 2; index++) {
      const owner = people[index];
      const [org] = await tx
        .insert(s.organizations)
        .values({
          name: index === 0 ? 'باشگاه آفتاب' : 'باشگاه سپیدار',
          slug: `ui-club-${index}-${suffix}`,
          status: 'approved',
        })
        .returning();
      await tx
        .insert(s.organizationMembers)
        .values({ organizationId: org.id, userId: owner.id, role: 'owner' });
      await tx.insert(s.clubs).values({
        id: org.id,
        ownerId: owner.id,
        publicationStatus: 'published',
        lastVerifiedAt: new Date(),
        description:
          'فضای تمرین روشن و مجهز با برنامه‌های متنوع. داده‌های این مجموعه صرفاً برای بررسی رابط کاربری است.',
      });
      await tx
        .insert(s.clubCategoryLinks)
        .values({ clubId: org.id, categoryId: category.id });
      await tx
        .insert(s.clubSportLinks)
        .values({ clubId: org.id, sportId: sport.id });
      await tx
        .insert(s.clubPhones)
        .values({ clubId: org.id, number: '02100000000', isPrimary: true });
      const branchIds: string[] = [];
      for (let b = 0; b < 2; b++) {
        const [branch] = await tx
          .insert(s.branches)
          .values({
            organizationId: org.id,
            name: b === 0 ? 'شعبه مرکزی' : 'شعبه شمال',
            slug: `branch-${b}`,
          })
          .returning();
        branchIds.push(branch.id);
        await tx.insert(s.branchProfiles).values({
          clubId: org.id,
          branchId: branch.id,
          isMain: b === 0,
          address: b === 0 ? 'تهران، خیابان ولیعصر' : 'تهران، خیابان نیاوران',
          countryId: country.id,
          provinceId: province.id,
          cityId: city.id,
          latitude: 35.73 + b * 0.06 + index * 0.02,
          longitude: 51.41 + index * 0.03,
          rules: 'همراه داشتن کفش مناسب الزامی است.',
        });
        await tx
          .insert(s.branchSports)
          .values({ branchId: branch.id, sportId: sport.id });
        if (publication && index === 0 && b === 0) {
          await tx
            .update(s.branchProfiles)
            .set({
              audiencePolicies: {
                audiences: ['women', 'men'],
                minimumAge: 18,
                maximumAge: 65,
                notes: 'هماهنگی با پذیرش پیش از اولین مراجعه',
              },
            })
            .where(eq(s.branchProfiles.branchId, branch.id));
          await tx.insert(s.branchEquipments).values({
            branchId: branch.id,
            equipmentId: equipment.id,
            quantity: 3,
            description: 'تجهیزات صرفاً برای بررسی رابط',
          });
          await tx.insert(s.branchAmenities).values(
            facilities.map((item, index) => ({
              branchId: branch.id,
              amenityId: item.id,
              availability: (['included', 'paid', 'unavailable'] as const)[
                index
              ],
            })),
          );
          await tx.insert(s.branchAccessibility).values({
            branchId: branch.id,
            featureId: accessibility.id,
            description: 'ورودی هم‌سطح خیابان',
          });
          await tx.insert(s.clubPhones).values({
            clubId: org.id,
            branchId: branch.id,
            number: '02100000001',
            label: 'پذیرش',
            extension: '21',
          });
        }
        await tx.insert(s.weeklyHours).values(
          Array.from({ length: 7 }, (_, dayOfWeek) => ({
            branchId: branch.id,
            dayOfWeek,
            startMinute: 480,
            endMinute: 1320,
          })),
        );
        const [media] = await tx
          .insert(s.clubMedia)
          .values({
            organizationId: org.id,
            uploadedBy: owner.id,
            type: 'image',
            url: `${applicationOrigin}/images/club-placeholder.svg?fixture=${index}-${b}`,
            alt: `${org.name} ${branch.name}`,
          })
          .returning();
        await tx.insert(s.clubGallery).values({
          clubId: org.id,
          branchId: branch.id,
          mediaId: media.id,
          caption: branch.name,
        });
        if (b === 0)
          await tx
            .update(s.clubs)
            .set({ coverId: media.id, logoId: media.id })
            .where(eq(s.clubs.id, org.id));
        await tx.insert(s.clubReviews).values({
          branchId: branch.id,
          authorId: people[2].id,
          rating: b === 0 ? 4 : 5,
          body:
            b === 0
              ? 'فضای شعبه مرکزی مرتب و مناسب تمرین است.'
              : 'این نظر مخصوص شعبه شمال است.',
          status: 'published',
        });
        const [group] = await tx
          .insert(s.tariffGroups)
          .values({ clubId: org.id, branchId: branch.id })
          .returning();
        await tx.insert(s.tariffVersions).values({
          groupId: group.id,
          version: 1,
          name: b === 0 ? 'ورود تک جلسه' : 'عضویت ماهانه',
          serviceType: b === 0 ? 'visit' : 'membership',
          unit: b === 0 ? 'visit' : 'month',
          priceToman: b === 0 ? 200000 + index * 50000 : 1500000,
          conditions: 'فقط برای بررسی رابط کاربری',
          effectiveFrom: new Date(Date.now() - 60000),
          createdBy: owner.id,
        });
      }
      clubs.push({ id: org.id, branches: branchIds });
    }
    return {
      people,
      clubs,
      countryId: country.id,
      provinceId: province.id,
      cityId: city.id,
      categoryId: category.id,
      sportId: sport.id,
      equipmentId: equipment?.id,
      facilityIds: facilities.map((item) => item.id),
      accessibilityId: accessibility?.id,
    };
  });
  return {
    ...seeded,
    cleanup: async () => {
      await db.transaction(async (tx) => {
        for (const club of seeded.clubs) {
          await tx
            .delete(s.auditEvents)
            .where(eq(s.auditEvents.organizationId, club.id));
          await tx
            .delete(s.tariffGroups)
            .where(eq(s.tariffGroups.clubId, club.id));
          await tx
            .delete(s.branches)
            .where(eq(s.branches.organizationId, club.id));
          await tx.delete(s.clubs).where(eq(s.clubs.id, club.id));
          await tx
            .delete(s.clubMedia)
            .where(eq(s.clubMedia.organizationId, club.id));
          await tx
            .delete(s.organizationMembers)
            .where(eq(s.organizationMembers.organizationId, club.id));
          await tx
            .delete(s.organizations)
            .where(eq(s.organizations.id, club.id));
        }
        await tx.delete(s.auditEvents).where(
          inArray(
            s.auditEvents.actorId,
            seeded.people.map((p) => p.id),
          ),
        );
        await tx.delete(s.otpChallenges).where(
          inArray(
            s.otpChallenges.phone,
            seeded.people.map((p) => p.phone),
          ),
        );
        await tx.delete(s.users).where(
          inArray(
            s.users.id,
            seeded.people.map((p) => p.id),
          ),
        );
        await tx
          .delete(s.clubCategories)
          .where(eq(s.clubCategories.id, seeded.categoryId));
        await tx.delete(s.sports).where(eq(s.sports.id, seeded.sportId));
        if (seeded.equipmentId)
          await tx
            .delete(s.equipments)
            .where(eq(s.equipments.id, seeded.equipmentId));
        if (seeded.facilityIds.length)
          await tx
            .delete(s.amenities)
            .where(inArray(s.amenities.id, seeded.facilityIds));
        if (seeded.accessibilityId)
          await tx
            .delete(s.accessibilityFeatures)
            .where(eq(s.accessibilityFeatures.id, seeded.accessibilityId));
        await tx.delete(s.cities).where(eq(s.cities.id, seeded.cityId));
        await tx
          .delete(s.provinces)
          .where(eq(s.provinces.id, seeded.provinceId));
        await tx
          .delete(s.countries)
          .where(eq(s.countries.id, seeded.countryId));
      });
    },
  };
}
