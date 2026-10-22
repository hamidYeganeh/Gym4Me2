import type { ServiceDto, BookingDto } from "@repo/api/sports";
import type {
  PlanContent,
  Workout,
  TrainingWorkspace,
  Exercise,
} from "@repo/api/profile";
import { webFixtureId } from "./public-services";
import { protectedCatalogFixtures } from "./protected-catalog";

/** No request escapes this fetch adapter. It neither creates nor reads server data. */
export function createMobileFixtureFetch(
  catalog: ReturnType<typeof protectedCatalogFixtures>,
  services: ServiceDto[],
  state: string,
): typeof fetch {
  const at = new Date().toISOString(),
    actorId = webFixtureId(9999);
  const content: PlanContent = {
    title: "قدرت و تعادل · Strength",
    note: "",
    days: [
      {
        name: "روز اول · Full body",
        exercises: [
          {
            id: "set-1",
            exerciseId: "squat",
            sets: 3,
            reps: 12,
            seconds: null,
            load: 20,
            restSeconds: 60,
            note: "حرکت کنترل‌شده و تنفس آرام",
            group: "single",
            groupId: "",
          },
        ],
      },
    ],
  };
  let workout: Workout = {
    id: webFixtureId(700),
    athleteId: actorId,
    assignmentId: null,
    relationshipId: null,
    snapshot: content,
    logs: [],
    dayIndex: 0,
    state: "in_progress",
    revision: 1,
    shared: false,
    startedAt: at,
    endedAt: null,
    feedback: "",
    reviewedAt: null,
  };
  const library: Exercise[] = [
    {
      id: "squat",
      nameFa: "اسکوات",
      nameEn: "Squat",
      equipment: "barbell",
      tags: ["strength"],
      instructionFa: "پاها به عرض شانه، زانوها هم‌جهت با پنجه‌ها و پشت صاف.",
      instructionEn:
        "Stand shoulder-width apart. Keep your back neutral and knees aligned with your toes.",
      alternatives: [],
      illustration: "/images/clubs/training.webp",
      source: "Local visual fixture",
    },
  ];
  const workspace = (): TrainingWorkspace => ({
    actorId,
    plans: [
      {
        id: webFixtureId(1),
        title: content.title,
        revision: 1,
        isTemplate: false,
        ownerId: actorId,
        relationshipId: null,
        updatedAt: at,
      },
    ],
    assignments: [
      {
        id: webFixtureId(701),
        relationshipId: null,
        versionId: webFixtureId(702),
        planId: webFixtureId(1),
        version: 1,
        content,
        effectiveFrom: at,
      },
    ],
    sessions: [workout],
    relationships: [],
    tasks: [],
    capabilities: { privateVideo: false },
  });
  const booking: BookingDto = {
    id: webFixtureId(1),
    serviceId: services[0]!.id,
    branchId: webFixtureId(901),
    occurrenceId: services[0]!.occurrences[0]!.id,
    orderId: webFixtureId(703),
    snapshot: {
      title: services[0]!.title,
      policy: services[0]!.policy,
      eligibility: services[0]!.eligibility,
    },
    title: services[0]!.title,
    branchName: "شعبه مرکزی",
    status: "confirmed",
    startAt: services[0]!.nextStartAt!,
    endAt: services[0]!.occurrences[0]!.endAt,
    revision: 1,
    amountMinor: services[0]!.amountMinor,
  };
  const reply = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  return async (input, init) => {
    const url = new URL(String(input), "http://visual.invalid"),
      path = url.pathname.replace(/^\/visual-fixture\//, "");
    if (state === "error") return reply({ code: "Errors.requestFailed" }, 503);
    if (
      state === "guest" &&
      !path.startsWith("catalog/") &&
      path !== "sports/services"
    )
      return reply({ code: "Errors.requestFailed" }, 401);
    if (init?.method && init.method !== "GET") {
      if (path === "profile/training/sessions/sync") {
        const body = JSON.parse(String(init.body));
        workout = { ...workout, ...body, revision: workout.revision + 1 };
        return reply(workout);
      }
      // Visual-only controls never claim that a real mutation succeeded.
      return reply({ code: "Errors.requestFailed" }, 403);
    }
    const empty = state === "empty";
    if (
      [
        "admin/analytics",
        "business/analytics",
        "profile/coach-analytics",
      ].includes(path)
    ) {
      const from = url.searchParams.get("from")!,
        to = url.searchParams.get("to")!,
        interval = url.searchParams.get("interval") ?? "day";
      return reply({
        filters: { from, to, interval },
        timezone: "Asia/Tehran",
        generatedAt: at,
        data: empty
          ? []
          : [
              { bucket: from, metric: "bookings", value: "17" },
              { bucket: from, metric: "attendance", value: "12" },
              { bucket: from, metric: "collectedMinor", value: "84000000" },
              { bucket: from, metric: "refundedMinor", value: "4000000" },
              { bucket: from, metric: "orders", value: "15" },
              { bucket: from, metric: "sessions", value: "8" },
              { bucket: from, metric: "capacity", value: "40" },
              { bucket: from, metric: "occupied", value: "17" },
            ],
        statuses: empty
          ? []
          : [
              { status: "confirmed", count: 9 },
              { status: "completed", count: 8 },
            ],
        platform: [],
        options: {
          branches: empty
            ? []
            : [
                {
                  id: booking.branchId,
                  name: "شعبه مرکزی",
                  organization_id: catalog.clubs[0]!.id,
                  organization_name: catalog.clubs[0]!.name,
                },
              ],
          services: empty
            ? []
            : [
                {
                  id: services[0]!.id,
                  title: services[0]!.title,
                  branch_id: booking.branchId,
                  organization_id: catalog.clubs[0]!.id,
                  kind: "class",
                },
              ],
        },
      });
    }
    if (path === "sports/community/preferences")
      return reply({
        reminders: true,
        invitations: true,

        messages: true,
      });

    if (path === "profile/account")
      return reply({
        id: actorId,
        phone: "+989000000000",
        displayName: "آرین · Arin",
        status: "active",
        phoneVerifiedAt: at,
      });
    if (path === "profile/access")
      return reply({ organizations: [], isAdmin: false });
    if (path === "profile/account/privacy")
      return reply({
        policy: {
          version: "1",
          minimumAge: 18,
          backupRetentionDays: 30,
          deletionGraceDays: 30,
          otpRetentionDays: 1,
          sessionRetentionDays: 30,
          invitationRetentionDays: 30,
          auditRetentionDays: 90,
          content: "",
          updatedAt: at,
        },
        marketingConsent: false,
        profilePublic: false,
        acceptedAt: at,
        acceptanceRequired: false,
        canRequestDeletion: true,
        deletion: null,
      });
    if (path === "profile/favorites") return reply([]);
    if (path === "auth/password/status")
      return reply({ hasPassword: true, canSetPassword: false });
    if (path === "catalog/clubs") return reply(empty ? [] : catalog.summaries);
    if (path.startsWith("catalog/clubs/") && path.includes("/branches/"))
      return reply(path.endsWith("/reviews") ? [] : catalog.branches[0]);
    if (path.startsWith("catalog/clubs/")) return reply(catalog.clubs[0]);
    if (path.startsWith("catalog/taxonomies/"))
      return reply([catalog.category]);
    if (path.startsWith("catalog/locations/")) return reply([]);
    if (path === "sports/services") return reply(empty ? [] : services);
    if (path.startsWith("sports/services/"))
      return reply(services.find((s) => path.endsWith(s.id)) ?? services[0]);
    if (path === "sports/account/bookings/page")
      return reply({ items: empty ? [] : [booking], nextCursor: null });
    if (path === `sports/account/bookings/${booking.id}`) return reply(booking);
    if (path === "sports/community/conversations/page")
      return reply({
        items: empty
          ? []
          : [
              {
                id: webFixtureId(601),
                title: "تمرین گروهی صبح",
                lastMessage: "فردا ۱۰ دقیقه زودتر در استودیو باشیم.",
                lastMessageHasImage: false,
                unread: 2,
                closed: false,
              },
            ],
        nextCursor: null,
      });
    if (path === "sports/community/notifications/page")
      return reply({
        items: empty
          ? []
          : [
              {
                id: webFixtureId(602),
                title: "رزروت تأیید شد",
                body: "یوگا و انعطاف صبحگاهی · شعبه مرکزی",
                createdAt: at,
                readAt: null,
                href: "/bookings",
                destination: "/bookings",
              },
            ],
        nextCursor: null,
      });
    if (path.includes("/page")) return reply({ items: [], nextCursor: null });
    if (path === "profile/training/home-summary")
      return reply({
        active: empty ? null : { id: workout.id, title: content.title },
        plan: null,
      });
    if (path === "profile/training/exercises") return reply(library);
    if (path === "profile/training")
      return reply(
        empty
          ? { ...workspace(), plans: [], assignments: [], sessions: [] }
          : workspace(),
      );
    if (path === "profile/training/progress")
      return reply({ measurements: [], sessions: [] });
    if (path.startsWith("profile/training/plans/"))
      return reply({
        ...workspace().plans[0],
        draft: content,
        canEdit: true,
        versions: [],
      });
    if (path === "profile/coaching")
      return reply({ profile: null, items: [], hasMore: false });
    if (path === "profile/coaching-practice")
      return reply({
        practice: null,
        credentials: [],
        availability: [],
        services: [],
        sessions: [],
        notes: [],
        studentSessions: [],
      });
    if (path === "system/policy")
      return reply({
        version: "1",
        minimumAge: 18,
        backupRetentionDays: 30,
        deletionGraceDays: 30,
        otpRetentionDays: 1,
        sessionRetentionDays: 30,
        invitationRetentionDays: 30,
        auditRetentionDays: 90,
      });
    return reply([]);
  };
}
