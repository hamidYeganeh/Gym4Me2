import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { sql } from 'drizzle-orm';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';
import {
  CommerceService,
  rows,
} from '../src/modules/commerce/commerce.service';
import { SportsMediaService } from '../src/modules/commerce/media.service';
import { serviceSchema } from '../src/modules/commerce/commerce.contracts';
import { CoachingPracticeService } from '../src/modules/coaching/practice.service';
import { TrainingService } from '../src/modules/training/training.service';
import { type PlanContent } from '../src/modules/training/training.contracts';
import {
  showcaseCities,
  showcaseClubs,
  showcaseCoaches,
  showcasePlans,
} from './demo-showcase.data';

const fixture = 'gym4me-visual-catalog-v1';
function id(key: string) {
  const h = createHash('sha256').update(`${fixture}:${key}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
const policy = {
  cancellationHours: 12,
  lateRefundBasisPoints: 0,
  noShowConsumesSession: true,
  consumeOn: 'attendance',
  freezeDays: 7,
  depositBasisPoints: 0,
  guestAllowance: 0,
  transferable: false,
  terms:
    'نمونهٔ دمو؛ پرداخت واقعی نیست. لغو تا ۱۲ ساعت پیش از شروع با استرداد کامل انجام می‌شود.',
} as const;
type Branch = {
  id: string;
  clubId: string;
  owner: string;
  key: string;
  name: string;
  image: string;
  clubName: string;
  sport: string;
};

/** Additive, repeatable showcase. No reset, no relationship revival, no fabricated reviews. */
export async function provisionDemoShowcase() {
  if (
    process.env.DEMO_MODE !== 'true' ||
    process.env.DEMO_PROVISION_CONFIRM !== 'gym4me-demo-postgres' ||
    process.env.DEMO_SHOWCASE_CONFIRM !== fixture
  )
    throw new Error(
      'Explicit isolated showcase provisioning confirmation required',
    );
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });
  try {
    const db = app.get(DatabaseService).db;
    const [marker] = await rows<{ ready: boolean }>(
      db,
      sql`SELECT ready FROM gym4me_demo_installation WHERE id='isolated-demo-v1'`,
    );
    if (!marker?.ready) throw new Error('Requires the existing isolated demo');
    const accounts = await rows<{ user_id: string; phone: string }>(
      db,
      sql`SELECT a.user_id,a.phone FROM gym4me_demo_accounts a JOIN users u ON u.id=a.user_id AND u.phone=a.phone WHERE a.phone IN ('+989000000001','+989000000002','+989000000003','+989000000004','+989000000008') AND u.deleted_at IS NULL AND NOT u.deletion_pending`,
    );
    const account = (phone: string) => {
      const actor = accounts.find((a) => a.phone === phone)?.user_id;
      if (!actor) throw new Error('Synthetic demo identity missing');
      return actor;
    };
    const owners = [account('+989000000001'), account('+989000000002')],
      athlete = account('+989000000003'),
      coach = account('+989000000008'),
      admin = account('+989000000004');
    const origin = new URL(process.env.AUTH_APPLICATION_ORIGIN!);
    if (
      origin.protocol !== 'https:' &&
      origin.hostname !== '127.0.0.1' &&
      origin.hostname !== 'localhost'
    )
      throw new Error('Valid application origin required');
    const branches: Branch[] = [];
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(7088,10)`);
      await tx.execute(
        sql`CREATE TABLE IF NOT EXISTS gym4me_demo_showcase_objects(kind text NOT NULL,item_key text NOT NULL,entity_id uuid NOT NULL,PRIMARY KEY(kind,item_key))`,
      );
      const [location] = await rows<{
        country_id: string;
        province_id: string;
      }>(
        tx,
        sql`SELECT bp.country_id,bp.province_id FROM branch_profiles bp JOIN clubs c ON c.id=bp.club_id WHERE c.owner_id=${owners[0]} AND bp.country_id IS NOT NULL ORDER BY bp.created_at LIMIT 1`,
      );
      if (!location) throw new Error('Demo catalog foundation missing');
      await tx.execute(
        sql`UPDATE countries SET name='ایران' WHERE id=${location.country_id} AND name='ایران آزمایشی'`,
      );
      await tx.execute(
        sql`UPDATE provinces SET name='تهران' WHERE id=${location.province_id} AND name ~ '^تهران [0-9a-f]{8}$' AND NOT EXISTS(SELECT 1 FROM provinces WHERE country_id=${location.country_id} AND name='تهران')`,
      );
      const locations: { country: string; province: string; city: string }[] =
        [];
      for (const city of showcaseCities) {
        await tx.execute(
          sql`INSERT INTO provinces(id,country_id,name) VALUES(${id(`province:${city.province}`)},${location.country_id},${city.province}) ON CONFLICT DO NOTHING`,
        );
        const [province] = await rows<{ id: string }>(
          tx,
          sql`SELECT id FROM provinces WHERE country_id=${location.country_id} AND name=${city.province}`,
        );
        await tx.execute(
          sql`INSERT INTO cities(id,province_id,name) VALUES(${id(`city:${city.name}`)},${province.id},${city.name}) ON CONFLICT DO NOTHING`,
        );
        const [place] = await rows<{ id: string }>(
          tx,
          sql`SELECT id FROM cities WHERE province_id=${province.id} AND name=${city.name}`,
        );
        for (const neighborhood of city.neighborhoods)
          await tx.execute(
            sql`INSERT INTO districts(id,city_id,name) VALUES(${id(`district:${city.name}:${neighborhood}`)},${place.id},${neighborhood}) ON CONFLICT DO NOTHING`,
          );
        locations.push({
          country: location.country_id,
          province: province.id,
          city: place.id,
        });
      }
      const taxonomy = ['تمرین قدرتی', 'پیلاتس', 'یوگا', 'آمادگی جسمانی'];
      for (const [index, name] of taxonomy.entries())
        await tx.execute(
          sql`INSERT INTO sports(id,name,slug) VALUES(${id(`sport:${name}`)},${name},${`showcase-sport-${index}`}) ON CONFLICT DO NOTHING`,
        );
      for (const [index, name] of ['دوش', 'کمد', 'رختکن', 'تهویه'].entries())
        await tx.execute(
          sql`INSERT INTO amenities(id,name,slug) VALUES(${id(`amenity:${name}`)},${name},${`showcase-amenity-${index}`}) ON CONFLICT DO NOTHING`,
        );
      await tx.execute(
        sql`INSERT INTO club_categories(id,name,slug) VALUES(${id('category')},'باشگاه و استودیو','showcase-fitness-studio') ON CONFLICT DO NOTHING`,
      );
      for (const [index, club] of showcaseClubs.entries()) {
        const clubId = id(`club:${club.key}`),
          owner = owners[index % owners.length],
          city = showcaseCities[club.city],
          place = locations[club.city];
        await tx.execute(
          sql`INSERT INTO organizations(id,name,slug,status) VALUES(${clubId},${club.name},${`demo-showcase-${club.key}`},'approved') ON CONFLICT DO NOTHING`,
        );
        await tx.execute(
          sql`INSERT INTO organization_members(organization_id,user_id,role) VALUES(${clubId},${owner},'owner') ON CONFLICT DO NOTHING`,
        );
        await tx.execute(
          sql`INSERT INTO clubs(id,owner_id,description,short_description,publication_status,last_verified_at) VALUES(${clubId},${owner},${club.description + ' این مجموعه و تصاویر آن نمونهٔ دمو هستند.'},${club.description},'published',now()) ON CONFLICT DO NOTHING`,
        );
        await tx.execute(
          sql`INSERT INTO club_category_links(club_id,category_id) VALUES(${clubId},${id('category')}) ON CONFLICT DO NOTHING`,
        );
        await tx.execute(
          sql`INSERT INTO club_sport_links(club_id,sport_id) VALUES(${clubId},${id(`sport:${club.sport}`)}) ON CONFLICT DO NOTHING`,
        );
        for (const [n, name] of club.branches.entries()) {
          const branchId = id(`branch:${club.key}:${n}`),
            mediaId = id(`image:${club.key}:${n}`);
          const [district] = await rows<{ id: string }>(
            tx,
            sql`SELECT id FROM districts WHERE city_id=${place.city} AND name=${name}`,
          );
          await tx.execute(
            sql`INSERT INTO branches(id,organization_id,name,slug) VALUES(${branchId},${clubId},${name},${`showcase-${n}`}) ON CONFLICT DO NOTHING`,
          );
          await tx.execute(
            sql`INSERT INTO branch_profiles(branch_id,club_id,is_main,address,country_id,province_id,city_id,district_id,latitude,longitude,neighborhood,rules) VALUES(${branchId},${clubId},${n === 0},${`${city.name}، ${name} · نشانی نمونهٔ دمو`},${place.country},${place.province},${place.city},${district?.id ?? null},${city.latitude + n * 0.01},${city.longitude + n * 0.01},${name},'کفش تمیز و حوله همراه داشته باشید. زمان مراجعه را از بخش رزرو انتخاب کنید.') ON CONFLICT DO NOTHING`,
          );
          await tx.execute(
            sql`INSERT INTO branch_sports(branch_id,sport_id) VALUES(${branchId},${id(`sport:${club.sport}`)}) ON CONFLICT DO NOTHING`,
          );
          for (const amenity of ['دوش', 'کمد', 'رختکن', 'تهویه'])
            await tx.execute(
              sql`INSERT INTO branch_amenities(branch_id,amenity_id,availability) VALUES(${branchId},${id(`amenity:${amenity}`)},'included') ON CONFLICT DO NOTHING`,
            );
          for (let day = 0; day < 7; day++)
            await tx.execute(
              sql`INSERT INTO branch_weekly_hours(id,branch_id,day_of_week,start_minute,end_minute) VALUES(${id(`hours:${branchId}:${day}`)},${branchId},${day},420,1320) ON CONFLICT DO NOTHING`,
            );
          await tx.execute(
            sql`INSERT INTO club_media(id,organization_id,uploaded_by,type,url,alt) VALUES(${mediaId},${clubId},${owner},'image',${`${origin.origin}/images/clubs/${club.image}.webp`},${`تصویر نمایشی ${club.name}؛ نمونهٔ ساخته‌شده برای دمو`}) ON CONFLICT DO NOTHING`,
          );
          await tx.execute(
            sql`INSERT INTO club_gallery(id,club_id,branch_id,media_id,caption) VALUES(${id(`gallery:${branchId}`)},${clubId},${branchId},${mediaId},${`${name} · تصویر نمایشی`}) ON CONFLICT DO NOTHING`,
          );
          if (n === 0)
            await tx.execute(
              sql`UPDATE clubs SET cover_id=${mediaId} WHERE id=${clubId} AND cover_id IS NULL`,
            );
          for (const [type, title, unit, price] of [
            ['visit', 'ورود روزانه', 'visit', 185000 + index * 15000],
            ['membership', 'عضویت یک‌ماهه', 'month', 1350000 + index * 95000],
          ] as const) {
            const group = id(`tariff:${branchId}:${type}`);
            await tx.execute(
              sql`INSERT INTO club_tariff_groups(id,club_id,branch_id) VALUES(${group},${clubId},${branchId}) ON CONFLICT DO NOTHING`,
            );
            await tx.execute(
              sql`INSERT INTO club_tariff_versions(id,group_id,version,name,service_type,unit,price_toman,conditions,effective_from,created_by) VALUES(${id(`tariff-version:${branchId}:${type}`)},${group},1,${title},${type},${unit},${price},'پرداخت این کاتالوگ ساختگی است.',current_date,${owner}) ON CONFLICT DO NOTHING`,
            );
          }
          branches.push({
            id: branchId,
            clubId,
            owner,
            key: club.key,
            name,
            image: club.image,
            clubName: club.name,
            sport: club.sport,
          });
        }
      }
      // Upgrade only the original unedited fixture placeholders, never user-uploaded media.
      await tx.execute(
        sql`UPDATE club_media SET url=${`${origin.origin}/images/clubs/strength.webp`},alt='تصویر نمایشی فضای باشگاه؛ نمونهٔ دمو' WHERE url LIKE ${`${origin.origin}/images/club-placeholder.svg?fixture=%`} AND organization_id IN(SELECT organization_id FROM organization_members WHERE user_id IN(${owners[0]},${owners[1]}) AND role='owner')`,
      );
    });
    const commerce = app.get(CommerceService),
      media = app.get(SportsMediaService),
      practice = app.get(CoachingPracticeService);
    async function finishService(serviceId: string, branch: Branch) {
      const [service] = await rows<{
        revision: number;
        status: string;
        cover_image_id: string | null;
      }>(
        db,
        sql`SELECT s.revision,s.status,v.cover_image_id FROM sport_services s JOIN LATERAL(SELECT cover_image_id FROM sport_service_versions WHERE service_id=s.id ORDER BY version DESC LIMIT 1) v ON true WHERE s.id=${serviceId}`,
      );
      if (service.status !== 'draft') return; // Published examples and user edits stay untouched.
      let revision = service.revision;
      if (!service.cover_image_id) {
        const body = await readFile(
          resolve(
            __dirname,
            `../../application/public/images/clubs/${branch.image}.webp`,
          ),
        );
        const result = await media.upload(
          branch.owner,
          serviceId,
          {
            revision,
            idempotencyKey: `showcase-cover-${serviceId}`,
            alt: `${branch.clubName} · تصویر نمایشی دمو`,
          },
          { buffer: body, size: body.length, mimetype: 'image/webp' },
        );
        revision = result.revision;
      }
      await commerce.publish(branch.owner, serviceId, revision);
    }
    const at = (days: number, hours = 0) =>
      new Date(Date.now() + days * 86400000 + hours * 3600000).toISOString();
    for (const [index, branch] of branches.entries()) {
      for (const kind of ['access', 'membership', 'class'] as const) {
        const key = `${branch.id}:${kind}`;
        const serviceId = await db.transaction(async (tx) => {
          await tx.execute(sql`SELECT pg_advisory_xact_lock(7088,10)`);
          const [known] = await rows<{ entity_id: string }>(
            tx,
            sql`SELECT entity_id FROM gym4me_demo_showcase_objects WHERE kind='service' AND item_key=${key}`,
          );
          if (known) return known.entity_id;
          const service = await commerce.createService(
            branch.owner,
            serviceSchema.parse({
              organizationId: branch.clubId,
              branchId: branch.id,
              kind,
              title:
                kind === 'access'
                  ? `یک روز در ${branch.clubName}`
                  : kind === 'membership'
                    ? `عضویت یک‌ماهه · ${branch.name}`
                    : `${branch.sport} · گروه کوچک`,
              description: `تمرین در ${branch.clubName}، شعبهٔ ${branch.name}. تجهیزات و امکانات در صفحهٔ باشگاه معرفی شده‌اند. این خدمت برای تجربهٔ دمو ساخته شده است.`,
              amountMinor: String(
                kind === 'membership'
                  ? 13500000 + index * 950000
                  : kind === 'access'
                    ? 1850000 + index * 150000
                    : 3200000 + index * 150000,
              ),
              durationDays: kind === 'membership' ? 30 : null,
              sessionCount: kind === 'membership' ? 12 : null,
              policy,
              level: 'شروع و متوسط',
            }),
            tx,
          );
          await tx.execute(
            sql`INSERT INTO gym4me_demo_showcase_objects(kind,item_key,entity_id) VALUES('service',${key},${service.id})`,
          );
          return service.id;
        });
        await finishService(serviceId, branch);
        const [scheduled] = await rows(
          db,
          sql`SELECT id FROM sport_occurrences WHERE service_id=${serviceId} LIMIT 1`,
        );
        if (kind !== 'membership' && !scheduled)
          for (const day of [1, 3, 6])
            await commerce.schedule(branch.owner, serviceId, {
              startAt: at(day, index % 4),
              endAt: at(day, (index % 4) + 1),
              capacity: kind === 'class' ? 8 : 18,
            });
      }
    }
    for (const [index, sample] of showcaseCoaches.entries()) {
      const coachId = id(`coach:${sample.key}`);
      const [existing] = await rows<{ id: string; demo: string | null }>(
        db,
        sql`SELECT u.id,a.user_id demo FROM users u LEFT JOIN gym4me_demo_accounts a ON a.user_id=u.id WHERE u.phone=${sample.phone}`,
      );
      if (existing && (existing.id !== coachId || !existing.demo))
        throw new Error('Reserved showcase phone is already owned');
      await db.transaction(async (tx) => {
        await tx.execute(
          sql`INSERT INTO users(id,phone,display_name,phone_verified_at,profile_public) VALUES(${coachId},${sample.phone},${sample.name},now(),true) ON CONFLICT DO NOTHING`,
        );
        await tx.execute(
          sql`INSERT INTO gym4me_demo_accounts(user_id,phone,label) VALUES(${coachId},${sample.phone},${`مربی نمونه · ${sample.name}`}) ON CONFLICT DO NOTHING`,
        );
        await tx.execute(
          sql`INSERT INTO coach_profiles(user_id,biography) VALUES(${coachId},${sample.biography}) ON CONFLICT DO NOTHING`,
        );
      });
      if (!(await practice.workspace(coachId)).practice) {
        await practice.save(coachId, {
          specialties: [sample.specialty],
          goals: [sample.goal],
          city: sample.city,
          experienceYears: sample.years,
          published: true,
          bufferMinutes: 5,
          travelMinutes: 10,
          revision: 1,
        });
        await practice.credential(coachId, {
          title: 'مدرک نمونه؛ فاقد اعتبار واقعی',
          issuer: 'کاتالوگ ساختگی Gym4Me',
          expiresAt: at(180),
        });
        const current = (await practice.workspace(coachId)).practice;
        await practice.review(admin, coachId, {
          approved: true,
          reason: 'تأیید ساختگی فقط در دموی ایزوله؛ سابقه و مدرک واقعی نیست.',
          expiresAt: at(120),
          revision: Number(current.revision),
        });
        await practice.availability(coachId, {
          kind: 'available',
          startsAt: at(0),
          endsAt: at(30),
        });
      }
      const branch = branches.find((b) => b.key === sample.club)!;
      await db.execute(
        sql`INSERT INTO branch_coaches(branch_id,coach_id,status) VALUES(${branch.id},${coachId},'active') ON CONFLICT DO NOTHING`,
      );
      const [offering] = await rows<{ service_id: string }>(
        db,
        sql`SELECT cs.service_id FROM coaching_services cs JOIN sport_services s ON s.id=cs.service_id WHERE cs.coach_id=${coachId} AND s.branch_id=${branch.id} LIMIT 1`,
      );
      if (!offering) {
        const created = await practice.createOffering(branch.owner, {
          service: serviceSchema.parse({
            organizationId: branch.clubId,
            branchId: branch.id,
            title: `یک جلسه با ${sample.name}`,
            kind: 'class',
            amountMinor: String(4800000 + index * 450000),
            coachUserId: coachId,
            coachName: sample.name,
            policy,
            description: sample.biography,
          }),
          mode: 'private',
          entryAmountMinor: '0',
          idempotencyKey: `showcase-coach-${sample.key}`,
        });
        if (
          !created ||
          typeof created !== 'object' ||
          !('id' in created) ||
          typeof created.id !== 'string'
        )
          throw new Error('Offering did not return a service identity');
        const serviceId = created.id;
        await finishService(serviceId, branch);
        for (const day of [2, 4, 7])
          await commerce.schedule(branch.owner, serviceId, {
            startAt: at(day, 2 + index),
            endAt: at(day, 3 + index),
            capacity: 1,
          });
      }
    }
    const training = app.get(TrainingService);
    for (const sample of showcasePlans) {
      const planId = id(`plan:${sample.key}`);
      if (
        (await rows(db, sql`SELECT id FROM training_plans WHERE id=${planId}`))
          .length
      )
        continue;
      const content: PlanContent = {
        title: sample.title,
        note: 'برنامهٔ نمایشی دمو؛ برنامهٔ شخصی‌سازی‌شدهٔ پزشکی یا ورزشی نیست. با توان و دامنهٔ راحت خود تمرین کنید.',
        days: sample.days.map(
          (day: { name: string; movements: readonly string[] }, n: number) => ({
            name: day.name,
            exercises: day.movements.map((movement: string, m: number) => ({
              id: id(`prescription:${sample.key}:${n}:${m}`),
              exerciseId: movement,
              sets: 2,
              reps: movement === 'plank' || movement === 'march' ? null : 10,
              seconds: movement === 'plank' || movement === 'march' ? 25 : null,
              load: null,
              restSeconds: 45,
              note: '',
              group: 'single' as const,
              groupId: '',
            })),
          }),
        ),
      };
      const actor = sample.template ? coach : athlete;
      await training.save(actor, {
        id: planId,
        revision: 0,
        relationshipId: null,
        isTemplate: sample.template,
        content,
        operationId: randomUUID(),
      });
      if (!sample.template)
        await training.publish(actor, planId, {
          revision: 1,
          effectiveFrom: new Date().toISOString().slice(0, 10),
          operationId: randomUUID(),
        });
    }
    console.log(
      'Showcase ready: six cities, six additional clubs, eight branches, four additional coaches and six plans/templates. Existing account data retained.',
    );
  } finally {
    await app.close();
  }
}
if (require.main === module)
  void provisionDemoShowcase().catch((error: unknown) => {
    console.error(
      'Showcase provisioning stopped:',
      error instanceof Error
        ? error.message.replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[redacted]')
        : 'precondition failed',
    );
    process.exitCode = 1;
  });
