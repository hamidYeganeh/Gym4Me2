import type {
  BookingDto,
  OrderDto,
  ServiceDto,
  SportsResourceDto,
  MembershipDto,
} from "@repo/api/sports";
import { protectedCatalogFixtures } from "./protected-catalog";
import { webFixtureId as id } from "./public-services";

type Context = {
  catalog: ReturnType<typeof protectedCatalogFixtures>;
  services: ServiceDto[];
  booking: BookingDto;
  order: OrderDto;
  at: string;
  surface: string;
  empty: boolean;
};

/** Explicit, synthetic read contracts for every remaining product view. */
export function routeVisual(path: string, c: Context): unknown | undefined {
  const { catalog, booking, services, order, at, surface, empty } = c;
  const club = catalog.clubs[0]!,
    branch = catalog.branches[0]!;
  const account = {
    id: id(9999),
    displayName: "آرین نادری",
    phone: "+989000000000",
    status: "active",
    phoneVerifiedAt: at,
    createdAt: at,
    isAdmin: surface === "admin",
  };
  const org = {
    id: club.id,
    name: club.name,
    slug: club.slug,
    status: "approved",
    role: "owner",
    allBranches: true,
    reviewReason: null,
    createdAt: at,
  };
  const conversation = {
    id: id(601),
    title: "تمرین گروهی صبح",
    closed: false,
    revision: 1,
    host: surface !== "application",
    occurrenceId: booking.occurrenceId,
    archived: false,
    createdAt: at,
    members: [
      { id: id(9999), displayName: account.displayName },
      { id: id(9998), displayName: "نازنین رضایی" },
    ],
  };
  const message = {
    id: id(603),
    senderId: id(9998),
    displayName: "نازنین رضایی",
    body: "برای جلسه فردا لباس مناسب و آب همراه داشته باش. در استودیو می‌بینمت.",
    imageUrl: null,
    createdAt: at,
    readByCount: 1,
  };
  const membership = {
    id: id(825),
    title: "عضویت ماهانه",
    status: "active",
    granted: 12,
    consumed: 2,
    held: 1,
    revision: 1,
    policy: booking.snapshot.policy,
    events: [],
    endsAt: "2027-01-01T00:00:00Z",
    freezeUntil: null,
    serviceId: services[0]!.id,
    organizationId: org.id,
    branchId: branch.id,
  } satisfies MembershipDto;
  const resources = [
    {
      id: id(820),
      organizationId: org.id,
      branchId: branch.id,
      name: "استودیو اصلی",
      revision: 1,
      active: true,
      unitIds: [],
      bufferBeforeMinutes: 5,
      bufferAfterMinutes: 5,
    },
  ] satisfies SportsResourceDto[];
  const ticket = {
    id: id(801),
    title: "زمان ورود به باشگاه",
    status: "open",
    createdAt: at,
    updatedAt: at,
    orderId: null,
    revision: 1,
    messages: [
      {
        id: id(802),
        body: "آیا می‌توانم ده دقیقه پیش از شروع سانس وارد شوم؟",
        createdAt: at,
        senderId: id(9999),
      },
    ],
  };
  if (path === "profile/push")
    return { enabled: false, publicKey: null, subscriptionId: null };
  if (path === "profile/access")
    return {
      organizations: surface === "application" ? [] : [org],
      isAdmin: surface === "admin",
    };
  if (path === "business/organizations") return empty ? [] : [org];
  if (/^business\/organizations\/[^/]+\/branches$/.test(path))
    return empty
      ? []
      : [
          {
            id: branch.id,
            name: branch.name,
            slug: branch.slug,
            timezone: "Asia/Tehran",
            createdAt: at,
          },
        ];
  if (/^business\/organizations\/[^/]+\/team$/.test(path))
    return {
      members: empty
        ? []
        : [
            {
              id: id(810),
              userId: id(9999),
              phone: account.phone,
              displayName: account.displayName,
              role: "owner",
              allBranches: true,
              branchIds: [],
            },
          ],
      invitations: [],
    };
  if (/^(business|admin)\/clubs\/[^/]+\/readiness$/.test(path))
    return { ready: true, errors: [] };
  if (/^(business|admin)\/clubs\/[^/]+\/branches\/[^/]+$/.test(path))
    return branch;
  if (/^(business|admin)\/clubs\/[^/]+\/tariffs$/.test(path))
    return club.tariffs;
  if (/^(business|admin)\/clubs\/[^/]+\/media\/[^/]+\/preview$/.test(path))
    return { url: "/images/clubs/studio.webp" };
  if (/^(business|admin)\/clubs\/[^/]+$/.test(path)) return club;
  if (path === "admin/overview")
    return {
      users: 28,
      organizations: 3,
      pending: 1,
      published: 2,
      pendingPublication: 0,
      pendingReviews: 1,
      recent: [],
    };
  if (path === "admin/users") return empty ? [] : [account];
  if (path.startsWith("admin/users/"))
    return {
      ...account,
      coach: null,
      memberships: [
        { id: id(811), organizationId: org.id, name: org.name, role: "owner" },
      ],
      sessions: [],
    };
  if (path === "admin/organizations")
    return empty ? [] : [{ ...org, publicationStatus: "published" }];
  if (path.startsWith("admin/organizations/"))
    return {
      ...org,
      updatedAt: at,
      hasCatalog: true,
      members: [
        {
          id: id(811),
          userId: account.id,
          displayName: account.displayName,
          role: "owner",
        },
      ],
      branches: [{ id: branch.id, name: branch.name, timezone: "Asia/Tehran" }],
    };
  if (path === "admin/audit")
    return empty
      ? []
      : [
          {
            id: id(812),
            action: "organization.created",
            actorId: account.id,
            actorName: account.displayName,
            organizationId: org.id,
            organizationName: org.name,
            targetId: org.id,
            details: {},
            createdAt: at,
          },
        ];
  if (path.startsWith("admin/taxonomies/"))
    return empty
      ? []
      : [
          {
            ...catalog.category,
            slug: "strength",
            isActive: true,
            sortOrder: 1,
          },
        ];
  if (/^(admin|catalog)\/locations\//.test(path))
    return empty ? [] : [{ id: id(813), name: "تهران", parentId: null }];
  if (path === "admin/reviews/reports") return [];
  if (path === "admin/demo")
    return {
      enabled: true,
      accounts: [],
      deliveries: [],
      notifications: [],
      jobs: [],
      events: [],
      scenarios: [],
      audit: [],
      provider: "sandbox",
    };
  if (path.startsWith("admin/sports/support/")) return ticket;
  if (path === "admin/reviews") return [];
  if (path === "admin/sports")
    return {
      refunds: [],
      orders: [order],
      payments: [],
      jobs: [],
      tickets: [ticket],
      reports: [],
    };
  if (path === "admin/sports/scheduling") return services;
  if (
    /^(business\/sports-operations|admin\/sports)\/services\/[^/]+\/occurrences$/.test(
      path,
    )
  )
    return empty
      ? []
      : (services
          .find((service) => path.includes(service.id))
          ?.occurrences.map((occurrence) => ({
            ...occurrence,
            revision: 1,
            occupied: 2,
            organizationId: org.id,
            branchId: branch.id,
            serviceTitle: services.find((service) => path.includes(service.id))!
              .title,
            resourceId: id(820),
          })) ?? []);
  if (path === "business/sports/services") return empty ? [] : services;
  if (path === "business/sports/resources") return empty ? [] : resources;
  if (
    path === "business/sports-operations/reception" ||
    path === "business/sports/reception"
  )
    return empty
      ? []
      : [
          {
            ...booking,
            displayName: account.displayName,
            paymentStatus: "paid",
          },
        ];
  if (path === "business/sports/visits") return [];
  if (path.includes("business/sports-resources/") && path.endsWith("/calendar"))
    return [];
  if (path === "business/sports-operations/members")
    return empty
      ? []
      : [
          {
            id: id(821),
            title: "عضویت ماهانه",
            status: "active",
            userId: account.id,
            displayName: account.displayName,
            granted: 12,
            consumed: 2,
            reserved: 1,
            held: 1,
            revision: 1,
            policy: booking.snapshot.policy,
            events: [],
            startsAt: at,
            endsAt: "2027-01-01T00:00:00Z",
            branchName: branch.name,
          },
        ];
  if (
    path === "business/sports-operations/payments" ||
    path === "business/sports-operations/orders"
  )
    return empty ? [] : [order];
  if (path === "business/sports-operations/reports")
    return {
      reservations: 12,
      attendance: 8,
      orders: 12,
      collectedMinor: "72000000",
      refundedMinor: "0",
    };
  if (
    path === "business/sports/calendars" ||
    path === "sports/community/host/calendar"
  )
    return {
      canManage: true,
      calendar: {
        id: id(822),
        title: "تقویم باشگاه",
        description: "برنامهٔ کلاس‌ها و رویدادهای باشگاه",
        published: true,
        revision: 1,
        createdAt: at,
        updatedAt: at,
        organizationId: org.id,
        branchId: branch.id,
      },
      clubName: club.name,
      branchName: branch.name,
      occurrences: services.flatMap((s) => s.occurrences),
      services,
    };
  if (path === "business/coaching/candidates") return [];
  if (path === "business/coaching/finance")
    return {
      contracts: [],
      ledger: [],
      balances: [],
      offerings: [],
      bookings: [],
    };
  if (path === "admin/coaching" || path === "admin/coaching/reports") return [];
  if (path === "auth/sessions")
    return empty
      ? []
      : [
          {
            id: id(823),
            client: surface,
            device: "Chrome · macOS",
            createdAt: at,
            expiresAt: "2027-01-01T00:00:00Z",
            current: true,
          },
        ];
  if (path === "profile/invitations")
    return empty
      ? []
      : [
          {
            id: id(824),
            organizationName: org.name,
            role: "manager",
            expiresAt: "2027-01-01T00:00:00Z",
          },
        ];
  if (path === "profile/coach/affiliations") return [];
  if (
    path === "business/sports-community/conversations/page" ||
    path === "sports/community/host/conversations/page" ||
    path === "sports/community/conversations/page"
  )
    return {
      items: empty
        ? []
        : [
            {
              ...conversation,
              unread: 2,
              lastMessage: message.body,
              lastMessageHasImage: false,
            },
          ],
      nextCursor: null,
    };
  if (
    /^sports\/community\/conversations\/[^/]+\/messages(?:\/page)?$/.test(
      path,
    ) ||
    /^business\/sports-community\/conversations\/[^/]+\/messages(?:\/page)?$/.test(
      path,
    )
  )
    return {
      conversation,
      messages: empty
        ? []
        : [
            message,
            {
              ...message,
              id: id(604),
              senderId: account.id,
              displayName: account.displayName,
              body: "ممنون، حتماً. تا فردا!",
            },
          ],
      nextCursor: null,
    };
  if (
    /^(sports\/community(?:\/host)?|business\/sports-community)\/conversations\/[^/]+$/.test(
      path,
    )
  )
    return {
      conversation,
      messages: empty
        ? []
        : [
            message,
            {
              ...message,
              id: id(604),
              senderId: account.id,
              displayName: account.displayName,
              body: "ممنون، حتماً. تا فردا!",
            },
          ],
      hasMore: false,
    };
  if (path === "sports/community/support") return empty ? [] : [ticket];
  if (/^sports\/community\/support\/[^/]+$/.test(path)) return ticket;
  if (path === "sports/account/memberships") return empty ? [] : [membership];
  if (path === "sports/calendars/page")
    return {
      items: empty
        ? []
        : [
            {
              id: id(822),
              title: "تقویم باشگاه",
              clubName: club.name,
              branchName: branch.name,
            },
          ],
      nextCursor: null,
    };
  if (/^sports\/(?:community\/)?calendars\/[^/]+\/follow$/.test(path))
    return { following: true };
  if (/^sports\/calendars\/[^/]+\/services$/.test(path))
    return { items: empty ? [] : services, nextCursor: null };
  if (/^sports\/calendars\/[^/]+$/.test(path))
    return {
      id: id(822),
      title: "تقویم باشگاه",
      description: "کلاس‌ها و تمرین‌های پیش رو",
      clubName: club.name,
      branchName: branch.name,
      organizationId: club.id,
      branchId: branch.id,
      revision: 1,
      createdAt: at,
      updatedAt: at,
      services: empty ? [] : services,
      nextServiceCursor: null,
    };
  if (path.startsWith("sports/account/memberships/")) return membership;
  if (path === "sports/account/waitlist") return [];
  if (path === "sports/community/invitations")
    return { items: [], nextCursor: null };
  if (path === "sports/account/documents" || path === "sports/documents")
    return [];
  if (path === "coaching/directory")
    return {
      items: empty
        ? []
        : [
            {
              userId: id(9998),
              displayName: "نازنین رضایی",
              biography: "مربی قدرت و انعطاف",
              specialties: ["قدرت"],
              goals: ["سلامت"],
              city: "تهران",
              experienceYears: 8,
              reviewExpiresAt: "2027-01-01T00:00:00Z",
              fromPriceMinor: "2500000",
            },
          ],
      hasMore: false,
    };
  if (path === "profile/coaching-practice/coaches") return [];
  if (
    path.startsWith("coaching/directory/") ||
    /^profile\/coaching-practice\/coaches\//.test(path)
  )
    return {
      userId: id(9998),
      displayName: "نازنین رضایی",
      biography: "مربی قدرت و انعطاف",
      specialties: ["قدرت"],
      goals: ["سلامت"],
      city: "تهران",
      experienceYears: 8,
      reviewExpiresAt: "2027-01-01T00:00:00Z",
      fromPriceMinor: "2500000",
      services: [],
      reviews: [],
    };
  if (path.endsWith("/assessment"))
    return {
      canEdit: true,
      goals: "افزایش قدرت",
      level: "متوسط",
      equipment: "دمبل",
      limitations: "",
      shared: false,
      revision: 1,
    };
  if (path.endsWith("/note"))
    return {
      canEdit: true,
      note: "فرم حرکات بهتر شده است.",
      followUp: "تمرکز بر تنفس",
      shared: true,
      revision: 1,
    };
  if (
    /^profile\/coaching-collaboration\/[^/]+\/messages(?:\/page)?$/.test(path)
  )
    return { items: [], nextCursor: null };
  if (/^profile\/coaching-collaboration\/[^/]+$/.test(path))
    return {
      relationship: {
        id: id(826),
        coachId: id(9998),
        studentId: account.id,
        status: "active",
        displayName: "نازنین رضایی",
        personalPlans: false,
        measurements: false,
      },
      sessions: [],
      plans: [],
      measurements: [],
      checkins: [],
      messages: [],
      sharing: { personalPlans: false, measurements: false },
    };
  return undefined;
}
