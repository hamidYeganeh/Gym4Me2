import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { sql } from 'drizzle-orm';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';
import {
  CommerceService,
  rows,
} from '../src/modules/commerce/commerce.service';
import { serviceSchema } from '../src/modules/commerce/commerce.contracts';
import { CoachingPracticeService } from '../src/modules/coaching/practice.service';
import { CoachingRecordsService } from '../src/modules/coaching/records.service';
import {
  practiceSchema,
  offeringSchema,
  contractSchema,
} from '../src/modules/coaching/practice.contracts';
export async function provisionDemoPh23() {
  if (
    process.env.DEMO_MODE !== 'true' ||
    process.env.DEMO_PROVISION_CONFIRM !== 'gym4me-demo-postgres'
  )
    throw new Error(
      'Explicit isolated demo provisioning confirmation required',
    );
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });
  try {
    const db = app.get(DatabaseService).db,
      practice = app.get(CoachingPracticeService),
      commerce = app.get(CommerceService),
      records = app.get(CoachingRecordsService);
    const people = await rows<{ user_id: string; phone: string }>(
      db,
      sql`SELECT user_id,phone FROM gym4me_demo_accounts WHERE phone IN('+989000000001','+989000000002','+989000000004','+989000000008')`,
    );
    const user = (phone: string) =>
      people.find((p) => p.phone === phone)?.user_id;
    const coach = user('+989000000008'),
      admin = user('+989000000004');
    if (!coach || !admin) throw new Error('Incomplete demo role setup');
    const now = Date.now(),
      at = (days: number, hours = 0) =>
        new Date(now + days * 86400000 + hours * 3600000).toISOString();
    if (!(await practice.workspace(coach)).practice) {
      await practice.save(
        coach,
        practiceSchema.parse({
          specialties: ['تمرین قدرتی', 'آمادگی جسمانی'],
          goals: ['تندرستی', 'قدرت'],
          city: 'تهران',
          experienceYears: 5,
          published: true,
          bufferMinutes: 5,
          travelMinutes: 15,
          revision: 1,
        }),
      );
      await practice.credential(coach, {
        title: 'مدرک مربی آزمایشی؛ صرفاً دمو',
        issuer: 'دادهٔ ساختگی Gym4Me',
        expiresAt: at(90),
      });
      const current = (await practice.workspace(coach)).practice;
      await practice.review(admin, coach, {
        approved: true,
        expiresAt: at(60),
        reason: 'تأیید ساختگی حساب رزروشدهٔ دمو؛ مدرک واقعی نیست',
        revision: Number(current.revision),
      });
    }
    const current = (await practice.workspace(coach)).practice;
    if (current.review_status !== 'approved') return;
    if (
      !(
        await rows(
          db,
          sql`SELECT id FROM coaching_availability WHERE coach_id=${coach} AND kind='available' AND starts_at<now()+interval '1 hour' AND ends_at>now()+interval '7 days' LIMIT 1`,
        )
      ).length
    )
      await practice.availability(coach, {
        kind: 'available',
        startsAt: at(0),
        endsAt: at(30),
      });
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
        'داده و پرداخت صرفاً آزمایشی‌اند. لغو تا ۱۲ ساعت قبل، استرداد کامل دارد. غیبت طبق همین نسخه باعث مصرف جلسه می‌شود.',
    } as const;
    for (const [index, phone] of ['+989000000001', '+989000000002'].entries()) {
      const owner = user(phone);
      if (!owner) continue;
      const [club] = await rows<{ organization_id: string; branch_id: string }>(
        db,
        sql`SELECT m.organization_id,b.id AS branch_id FROM organization_members m JOIN branches b ON b.organization_id=m.organization_id WHERE m.user_id=${owner} AND m.role='owner' ORDER BY (EXISTS(SELECT 1 FROM sport_services s WHERE s.branch_id=b.id)) DESC,b.created_at,b.id LIMIT 1`,
      );
      if (!club) continue;
      await rows(
        db,
        sql`INSERT INTO branch_coaches(branch_id,coach_id,status) VALUES(${club.branch_id},${coach},'active') ON CONFLICT(branch_id,coach_id) DO NOTHING`,
      );
      for (const [n, mode] of (
        ['private', 'semi_private', 'online', 'introduction'] as const
      ).entries()) {
        const title = {
          private: 'جلسهٔ خصوصی مربی آزمایشی',
          semi_private: 'تمرین نیمه‌خصوصی مربی آزمایشی',
          online: 'جلسهٔ آنلاین مربی آزمایشی',
          introduction: 'آشنایی و ارزیابی مربی آزمایشی',
        }[mode];
        let [service] = await rows<{ id: string }>(
          db,
          sql`SELECT s.id FROM sport_services s JOIN coaching_services cs ON cs.service_id=s.id WHERE s.organization_id=${club.organization_id} AND s.branch_id=${club.branch_id} AND cs.coach_id=${coach} AND cs.mode=${mode} AND s.kind='class' ORDER BY s.created_at LIMIT 1`,
        );
        if (!service)
          service = (await practice.createOffering(
            owner,
            offeringSchema.parse({
              service: {
                organizationId: club.organization_id,
                branchId: club.branch_id,
                title,
                kind: 'class',
                amountMinor: mode === 'introduction' ? '500000' : '2000000',
                coachUserId: coach,
                coachName: 'مربی آزمایشی',
                policy,
                approvalRequired: true,
              },
              mode,
              entryAmountMinor: mode === 'online' ? '0' : '100000',
              idempotencyKey: `demo-coaching-${index}-${mode}`,
            }),
          )) as { id: string };
        const upcoming = await rows(
          db,
          sql`SELECT id FROM sport_occurrences WHERE service_id=${service.id} AND start_at>now() AND status='scheduled' LIMIT 1`,
        );
        if (!upcoming.length)
          for (const day of [2, 3])
            await commerce.schedule(owner, service.id, {
              startAt: at(day, 2 + index * 12 + n * 2),
              endAt: at(day, 3 + index * 12 + n * 2),
              capacity: mode === 'semi_private' ? 4 : 1,
            });
      }
      if (
        !(
          await rows(
            db,
            sql`SELECT s.id FROM sport_services s JOIN coaching_services cs ON cs.service_id=s.id WHERE s.organization_id=${club.organization_id} AND cs.coach_id=${coach} AND s.kind='membership' LIMIT 1`,
          )
        ).length
      )
        await practice.createOffering(
          owner,
          offeringSchema.parse({
            service: {
              organizationId: club.organization_id,
              branchId: club.branch_id,
              title: 'بستهٔ چهار جلسه مربی آزمایشی',
              kind: 'membership',
              amountMinor: '6000000',
              durationDays: 30,
              sessionCount: 4,
              coachUserId: coach,
              coachName: 'مربی آزمایشی',
              policy,
            },
            mode: 'private',
            entryAmountMinor: '0',
            idempotencyKey: `demo-coaching-package-${index}`,
          }),
        );
      if (
        !(
          await rows(
            db,
            sql`SELECT id FROM coaching_contracts WHERE branch_id=${club.branch_id} AND coach_id=${coach} LIMIT 1`,
          )
        ).length
      )
        await records.contract(
          owner,
          contractSchema.parse({
            organizationId: club.organization_id,
            branchId: club.branch_id,
            coachId: coach,
            startsOn: new Date().toISOString().slice(0, 10),
            endsOn: null,
            shareBasisPoints: 5000,
            basis: 'gross',
            costsMinor: '0',
            terms:
              'قرارداد ساختگی دمو: سهم ثبت‌شده پس از جلسه و تأیید مالی، به‌صورت دستی ثبت می‌شود.',
          }),
        );
      // PH2 court and course use the same organization, capacities and mock checkout.
      for (const kind of ['court', 'course'] as const) {
        let [existing] = await rows<{ id: string }>(
          db,
          sql`SELECT id FROM sport_services WHERE organization_id=${club.organization_id} AND branch_id=${club.branch_id} AND kind=${kind} AND title=${kind === 'court' ? 'زمین آزمایشی قابل رزرو' : 'دورهٔ دو جلسه‌ای آزمایشی'} ORDER BY created_at LIMIT 1`,
        );
        if (!existing) {
          const resourceIds: string[] = [];
          if (kind === 'court') {
            const resource = await commerce.createResource(
              owner,
              club.organization_id,
              club.branch_id,
              'زمین دموی PH2',
              [],
              `demo-court-${index}`,
            );
            resourceIds.push(resource.id);
          }
          existing = await commerce.createService(
            owner,
            serviceSchema.parse({
              organizationId: club.organization_id,
              branchId: club.branch_id,
              title:
                kind === 'court'
                  ? 'زمین آزمایشی قابل رزرو'
                  : 'دورهٔ دو جلسه‌ای آزمایشی',
              kind,
              amountMinor: '1500000',
              resourceIds,
              policy,
            }),
          );
          await commerce.publish(owner, existing.id, 1);
          for (const day of [1, 2])
            await commerce.schedule(owner, existing.id, {
              startAt: at(day, 10 + index * 3),
              endAt: at(day, 11 + index * 3),
              capacity: kind === 'court' ? 1 : 10,
            });
        }
      }
    }
  } finally {
    await app.close();
  }
}
