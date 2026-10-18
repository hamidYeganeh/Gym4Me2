import { sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { DatabaseService } from '../src/database/database.service';
import type { CommerceService } from '../src/modules/commerce/commerce.service';
import { rows } from '../src/modules/commerce/commerce.service';
import { serviceSchema } from '../src/modules/commerce/commerce.contracts';
import type { StorageService } from '../src/modules/clubs/storage.service';
import type { SportsResourceService } from '../src/modules/commerce/resources.service';
import type { SportsCalendarService } from '../src/modules/commerce/calendars.service';
import type { SportsConversationService } from '../src/modules/commerce/conversations.service';
import type { SportsInvitationService } from '../src/modules/commerce/invitations.service';
/** Synthetic services for the explicitly isolated UI fixture, never production seeding. */
export async function seedUiSports(
  db: DatabaseService['db'],
  commerce: CommerceService,
  clubs: { id: string; branches: string[] }[],
  people: { id: string }[],
  storage: Pick<StorageService, 'delete'>,
  {
    bookingCount = 0,
    resources,
    invitations,
    conversations,
    communicationPages = false,
    calendars,
  }: {
    bookingCount?: number;
    resources?: SportsResourceService;
    invitations?: SportsInvitationService;
    conversations?: SportsConversationService;
    communicationPages?: boolean;
    calendars?: SportsCalendarService;
  } = {},
) {
  const ids: string[] = [];
  const conversationIds: string[] = [];
  if (communicationPages && !conversations)
    throw new Error('Communication pages require conversation fixtures.');
  const policy = {
    cancellationHours: 12,
    lateRefundBasisPoints: 0,
    noShowConsumesSession: true,
    consumeOn: 'attendance' as const,
    freezeDays: 7,
    depositBasisPoints: 0,
    guestAllowance: 0,
    transferable: false,
    terms:
      'لغو تا ۱۲ ساعت پیش از شروع بدون هزینه است. پس از آن مبلغ مسترد نمی‌شود. همراه داشتن لباس ورزشی مناسب ضروری است. این خدمت صرفاً برای بررسی رابط ساخته شده است.',
  };
  for (let index = 0; index < clubs.length; index++)
    for (const [kind, title, amount, sessions] of [
      ['class', 'یوگا صبحگاهی', '1800000', null],
      ['class', 'تمرین قدرتی گروهی', '2200000', null],
      ['membership', 'بسته هشت جلسه‌ای', '12000000', 8],
    ] as const) {
      const service = await commerce.createService(
        people[index].id,
        serviceSchema.parse({
          organizationId: clubs[index].id,
          branchId: clubs[index].branches[0],
          title,
          kind,
          amountMinor: amount,
          sessionCount: sessions,
          durationDays: kind === 'membership' ? 30 : null,
          policy,
          description:
            'فرصتی برای تمرین منظم در کنار گروهی همراه. سطح و شرایط پیش از ثبت‌نام مشخص است.',
          coachName: 'مربی آزمایشی',
          level: 'همه سطوح',
        }),
      );
      ids.push(service.id);
      await commerce.publish(people[index].id, service.id, 1);
      if (kind === 'class')
        for (let day = 1; day <= 3; day++)
          await commerce.schedule(people[index].id, service.id, {
            startAt: new Date(
              Date.now() + day * 86400000 + index * 3600000,
            ).toISOString(),
            endAt: new Date(
              Date.now() + day * 86400000 + (index + 1) * 3600000,
            ).toISOString(),
            capacity: 12,
          });
    }
  if (invitations || conversations) {
    const service = await commerce.createService(
      people[0].id,
      serviceSchema.parse({
        organizationId: clubs[0].id,
        branchId: clubs[0].branches[0],
        title: 'آشنایی با تمرین گروهی',
        kind: 'class',
        amountMinor: '0',
        policy,
      }),
    );
    ids.push(service.id);
    await commerce.publish(people[0].id, service.id, 1);
    const slot = await commerce.schedule(people[0].id, service.id, {
      startAt: new Date(Date.now() + 86400000).toISOString(),
      endAt: new Date(Date.now() + 90000000).toISOString(),
      capacity: 10,
    });
    await commerce.checkout(people[1].id, {
      serviceId: service.id,
      occurrenceId: slot.id,
      idempotencyKey: randomUUID(),
    });
    if (invitations)
      await invitations.create(people[0].id, {
        serviceId: ids[0],
        userId: people[1].id,
        idempotencyKey: randomUUID(),
      });
    if (conversations) {
      const chat = await conversations.start(people[0].id, slot.id);
      conversationIds.push(String(chat.id));
      await rows(
        db,
        sql`INSERT INTO sport_messages(conversation_id,sender_id,body,idempotency_key,created_at)
        SELECT ${String(chat.id)},CASE WHEN n%3=0 THEN ${people[1].id}::uuid ELSE ${people[0].id}::uuid END,'پیام آزمایشی گفتگو '||n,gen_random_uuid()::text,now()-interval '1 day'+n*interval '1 second' FROM generate_series(1,101) n`,
      );
      if (communicationPages) {
        for (let n = 1; n <= 24; n++) {
          const start = Date.now() + (30 + n) * 86400000;
          const extra = await commerce.schedule(people[0].id, service.id, {
            startAt: new Date(start).toISOString(),
            endAt: new Date(start + 3600000).toISOString(),
            capacity: 10,
          });
          await commerce.checkout(people[1].id, {
            serviceId: service.id,
            occurrenceId: extra.id,
            idempotencyKey: randomUUID(),
          });
          const thread = await conversations.start(people[0].id, extra.id);
          conversationIds.push(String(thread.id));
          await rows(
            db,
            sql`UPDATE sport_conversations SET title=${`گفتگوی تمرین ${n}`} WHERE id=${String(thread.id)}`,
          );
          await conversations.send(
            people[0].id,
            String(thread.id),
            `برنامهٔ تمرین و هماهنگی جلسهٔ ${n}`,
            randomUUID(),
          );
          if (n <= 3)
            await conversations.preferences(people[1].id, String(thread.id), {
              archived: true,
            });
        }
        await rows(
          db,
          sql`INSERT INTO sport_notifications(user_id,title,body,href,source_key,read_at) SELECT ${people[1].id},'برنامهٔ ورزشی شما','اعلان خوانده‌شدهٔ آزمایشی','/bookings',gen_random_uuid()::text,now() FROM generate_series(1,3)`,
        );
      }
    }
  }
  if (bookingCount > 0) {
    const service = await commerce.createService(
      people[0].id,
      serviceSchema.parse({
        organizationId: clubs[0].id,
        branchId: clubs[0].branches[0],
        title: 'تمرین آزمایشی تاریخچه رزرو',
        kind: 'class',
        amountMinor: '0',
        policy,
      }),
    );
    ids.push(service.id);
    await commerce.publish(people[0].id, service.id, 1);
    const start = Date.now() + 86400000;
    for (let index = 0; index < bookingCount; index++) {
      const slot = await commerce.schedule(people[0].id, service.id, {
        startAt: new Date(start + index * 86400000).toISOString(),
        endAt: new Date(start + index * 86400000 + 3600000).toISOString(),
        capacity: 1,
      });
      const order = await commerce.checkout(people[0].id, {
        serviceId: service.id,
        occurrenceId: slot.id,
        idempotencyKey: randomUUID(),
      });
      // Fixture-only states: pagination, ended-session history and cancelled future history.
      if (index === 0)
        await rows(
          db,
          sql`UPDATE sport_occurrences SET start_at=now()-interval '2 hours',end_at=now()-interval '1 hour' WHERE id=${slot.id}`,
        );
      if (index === bookingCount - 1 && index > 0)
        await rows(
          db,
          sql`UPDATE sport_reservations SET status='cancelled' WHERE id=${String(order.reservations[0].id)}`,
        );
    }
  }
  if (resources) {
    const owner = people[0].id;
    const resource = await commerce.createResource(
      owner,
      clubs[0].id,
      clubs[0].branches[0],
      'زمین چندمنظوره',
      [],
    );
    const [unit] = await rows<{ unit_id: string }>(
      db,
      sql`SELECT unit_id FROM sport_resource_units WHERE resource_id=${resource.id}`,
    );
    await commerce.createResource(
      owner,
      clubs[0].id,
      clubs[0].branches[0],
      'نیمه شرقی سالن',
      [unit.unit_id],
    );
    await resources.settings(owner, resource.id, {
      name: resource.name,
      bufferBeforeMinutes: 10,
      bufferAfterMinutes: 15,
      revision: 1,
      idempotencyKey: randomUUID(),
      reason: 'آماده‌سازی آزمایشی زمین',
    });
    const service = await commerce.createService(
      owner,
      serviceSchema.parse({
        organizationId: clubs[0].id,
        branchId: clubs[0].branches[0],
        title: 'رزرو آزمایشی زمین',
        kind: 'court',
        amountMinor: '0',
        resourceIds: [resource.id],
        policy,
      }),
    );
    ids.push(service.id);
    await commerce.publish(owner, service.id, 1);
    const start = Date.now() + 86400000;
    for (const day of [0, 1])
      await commerce.schedule(owner, service.id, {
        startAt: new Date(start + day * 86400000).toISOString(),
        endAt: new Date(start + day * 86400000 + 3600000).toISOString(),
        capacity: 1,
      });
    await resources.createBlock(owner, resource.id, {
      kind: 'maintenance',
      startAt: new Date(start).toISOString(),
      endAt: new Date(start + 3600000).toISOString(),
      revision: 2,
      idempotencyKey: randomUUID(),
      reason: 'تعمیرات آزمایشی کف سالن',
    });
  }
  const calendarIds: {
    id: string;
    title: string;
    branchId: string;
    organizationId: string;
  }[] = [];
  if (calendars) {
    for (let n = 1; n <= 24; n++) {
      const [branch] = await rows<{ id: string }>(
        db,
        sql`INSERT INTO branches(organization_id,name,slug) VALUES(${clubs[0].id},${`شعبهٔ تقویم ${n}`},${randomUUID()}) RETURNING id`,
      );
      await rows(
        db,
        sql`INSERT INTO branch_profiles(club_id,branch_id) VALUES(${clubs[0].id},${branch.id})`,
      );
      const calendar = await calendars.save(
        people[0].id,
        { organizationId: clubs[0].id, branchId: branch.id },
        {
          title: `تقویم تمرین هفتگی ${n}`,
          description:
            'تقویم مصنوعی برای بررسی صفحه‌بندی؛ دنبال‌کردن آن رزرو ایجاد نمی‌کند.',
          revision: 0,
          idempotencyKey: randomUUID(),
        },
      );
      await calendars.follow(people[1].id, String(calendar.id), true);
    }
    for (let n = 1; n <= 21; n++) {
      const service = await commerce.createService(
        people[0].id,
        serviceSchema.parse({
          organizationId: clubs[0].id,
          branchId: clubs[0].branches[0],
          title: `کلاس تقویم ${n}`,
          kind: 'class',
          amountMinor: '900000',
          policy,
          coachName: 'مربی آزمایشی',
        }),
      );
      ids.push(service.id);
      await commerce.publish(people[0].id, service.id, 1);
      const start = Date.now() + (n + 2) * 86400000;
      await commerce.schedule(people[0].id, service.id, {
        startAt: new Date(start).toISOString(),
        endAt: new Date(start + 3600000).toISOString(),
        capacity: 10,
      });
    }
    const records = await rows<{
      id: string;
      title: string;
      branch_id: string;
      organization_id: string;
    }>(
      db,
      sql`SELECT id,title,branch_id,organization_id FROM sport_calendars ORDER BY created_at,id`,
    );
    calendarIds.push(
      ...records.map((c) => ({
        id: c.id,
        title: c.title,
        branchId: c.branch_id,
        organizationId: c.organization_id,
      })),
    );
  }
  return {
    ids,
    calendarIds,
    conversationIds,
    cleanup: async () => {
      for (const person of people) {
        await rows(
          db,
          sql`DELETE FROM sport_notifications WHERE user_id=${person.id}`,
        );
        await rows(
          db,
          sql`DELETE FROM sport_notification_preferences WHERE user_id=${person.id}`,
        );
        await rows(
          db,
          sql`DELETE FROM sport_command_receipts WHERE user_id=${person.id}`,
        );
      }
      for (const club of clubs) {
        await rows(
          db,
          sql`DELETE FROM sport_outbox WHERE aggregate_id IN(SELECT id FROM sport_orders WHERE organization_id=${club.id} UNION ALL SELECT r.id FROM sport_reservations r JOIN sport_orders o ON o.id=r.order_id WHERE o.organization_id=${club.id} UNION ALL SELECT id FROM sport_memberships WHERE organization_id=${club.id})`,
        );
        await rows(
          db,
          sql`DELETE FROM sport_coach_claims WHERE occurrence_id IN(SELECT o.id FROM sport_occurrences o JOIN sport_services s ON s.id=o.service_id WHERE s.organization_id=${club.id})`,
        );
        const orders = await rows<{ id: string }>(
          db,
          sql`SELECT id FROM sport_orders WHERE organization_id=${club.id}`,
        );
        for (const order of orders) {
          await rows(
            db,
            sql`DELETE FROM sport_journal_lines WHERE journal_id IN(SELECT id FROM sport_journals WHERE order_id=${order.id})`,
          );
          await rows(
            db,
            sql`DELETE FROM sport_journals WHERE order_id=${order.id}`,
          );
          await rows(
            db,
            sql`DELETE FROM sport_refunds WHERE order_id=${order.id}`,
          );
          await rows(
            db,
            sql`DELETE FROM sport_payments WHERE order_id=${order.id}`,
          );
        }
        await rows(
          db,
          sql`DELETE FROM sport_ticket_messages WHERE ticket_id IN(SELECT id FROM sport_tickets WHERE order_id IN(SELECT id FROM sport_orders WHERE organization_id=${club.id}))`,
        );
        await rows(
          db,
          sql`DELETE FROM sport_tickets WHERE order_id IN(SELECT id FROM sport_orders WHERE organization_id=${club.id})`,
        );
        await rows(
          db,
          sql`DELETE FROM sport_message_reports WHERE message_id IN(SELECT id FROM sport_messages WHERE conversation_id IN(SELECT c.id FROM sport_conversations c JOIN sport_occurrences o ON o.id=c.occurrence_id JOIN sport_services s ON s.id=o.service_id WHERE s.organization_id=${club.id}))`,
        );
        await rows(
          db,
          sql`DELETE FROM sport_messages WHERE conversation_id IN(SELECT c.id FROM sport_conversations c JOIN sport_occurrences o ON o.id=c.occurrence_id JOIN sport_services s ON s.id=o.service_id WHERE s.organization_id=${club.id})`,
        );
        await rows(
          db,
          sql`DELETE FROM sport_conversation_preferences WHERE conversation_id IN(SELECT c.id FROM sport_conversations c JOIN sport_occurrences o ON o.id=c.occurrence_id JOIN sport_services s ON s.id=o.service_id WHERE s.organization_id=${club.id})`,
        );
        await rows(
          db,
          sql`DELETE FROM sport_conversations WHERE occurrence_id IN(SELECT o.id FROM sport_occurrences o JOIN sport_services s ON s.id=o.service_id WHERE s.organization_id=${club.id})`,
        );
        await rows(
          db,
          sql`DELETE FROM sport_attendance WHERE reservation_id IN(SELECT r.id FROM sport_reservations r JOIN sport_orders o ON o.id=r.order_id WHERE o.organization_id=${club.id})`,
        );
        await rows(
          db,
          sql`DELETE FROM sport_visits WHERE branch_id=ANY(${`{${club.branches.join(',')}}`}::uuid[])`,
        );
        await rows(
          db,
          sql`DELETE FROM sport_access_tokens WHERE reservation_id IN(SELECT r.id FROM sport_reservations r JOIN sport_orders o ON o.id=r.order_id WHERE o.organization_id=${club.id}) OR membership_id IN(SELECT id FROM sport_memberships WHERE organization_id=${club.id})`,
        );
        await rows(
          db,
          sql`DELETE FROM sport_entitlement_events WHERE membership_id IN(SELECT id FROM sport_memberships WHERE organization_id=${club.id})`,
        );
        await rows(
          db,
          sql`DELETE FROM sport_occupancies WHERE block_id IN(SELECT id FROM sport_resource_blocks WHERE organization_id=${club.id})`,
        );
        await rows(
          db,
          sql`DELETE FROM sport_resource_blocks WHERE organization_id=${club.id}`,
        );
        await rows(
          db,
          sql`DELETE FROM sport_occupancies WHERE occurrence_id IN(SELECT o.id FROM sport_occurrences o JOIN sport_services s ON s.id=o.service_id WHERE s.organization_id=${club.id}) OR reservation_id IN(SELECT r.id FROM sport_reservations r JOIN sport_orders o ON o.id=r.order_id WHERE o.organization_id=${club.id})`,
        );
        await rows(
          db,
          sql`DELETE FROM sport_waitlist WHERE occurrence_id IN(SELECT o.id FROM sport_occurrences o JOIN sport_services s ON s.id=o.service_id WHERE s.organization_id=${club.id})`,
        );
        await rows(
          db,
          sql`DELETE FROM sport_reservations WHERE order_id IN(SELECT id FROM sport_orders WHERE organization_id=${club.id})`,
        );
        await rows(
          db,
          sql`DELETE FROM sport_memberships WHERE organization_id=${club.id}`,
        );
        await rows(
          db,
          sql`DELETE FROM sport_orders WHERE organization_id=${club.id}`,
        );
        await rows(
          db,
          sql`DELETE FROM sport_occurrences WHERE service_id IN(SELECT id FROM sport_services WHERE organization_id=${club.id})`,
        );
        await rows(
          db,
          sql`DELETE FROM sport_occurrence_series WHERE service_id IN(SELECT id FROM sport_services WHERE organization_id=${club.id})`,
        );
        await rows(
          db,
          sql`DELETE FROM sport_documents WHERE service_id IN(SELECT id FROM sport_services WHERE organization_id=${club.id})`,
        );
        await rows(
          db,
          sql`DELETE FROM sport_coupons WHERE service_id IN(SELECT id FROM sport_services WHERE organization_id=${club.id})`,
        );
        await rows(
          db,
          sql`DELETE FROM sport_invitations WHERE service_id IN(SELECT id FROM sport_services WHERE organization_id=${club.id})`,
        );
        await rows(
          db,
          sql`DELETE FROM sport_quotes WHERE service_id IN(SELECT id FROM sport_services WHERE organization_id=${club.id})`,
        );
        await rows(
          db,
          sql`UPDATE sport_services SET status='draft',published_version_id=null WHERE organization_id=${club.id}`,
        );
        await rows(
          db,
          sql`DELETE FROM sport_service_versions WHERE service_id IN(SELECT id FROM sport_services WHERE organization_id=${club.id})`,
        );
        const images = await rows<{ object_key: string }>(
          db,
          sql`SELECT i.object_key FROM sport_service_images i JOIN sport_services s ON s.id=i.service_id WHERE s.organization_id=${club.id}`,
        );
        for (const image of images) await storage.delete(image.object_key);
        await rows(
          db,
          sql`DELETE FROM sport_service_images WHERE service_id IN(SELECT id FROM sport_services WHERE organization_id=${club.id})`,
        );
        await rows(
          db,
          sql`DELETE FROM sport_services WHERE organization_id=${club.id}`,
        );
        await rows(
          db,
          sql`DELETE FROM sport_calendar_follows WHERE calendar_id IN(SELECT id FROM sport_calendars WHERE organization_id=${club.id})`,
        );
        await rows(
          db,
          sql`DELETE FROM sport_calendars WHERE organization_id=${club.id}`,
        );
        await rows(
          db,
          sql`DELETE FROM sport_resource_units WHERE organization_id=${club.id}`,
        );
        await rows(
          db,
          sql`DELETE FROM sport_resources WHERE organization_id=${club.id}`,
        );
        await rows(
          db,
          sql`DELETE FROM sport_conflict_units WHERE organization_id=${club.id}`,
        );
      }
    },
  };
}
