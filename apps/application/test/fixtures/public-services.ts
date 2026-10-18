import type { ServiceDto, OccurrenceDto } from "@repo/api/sports";

export const webFixtureId = (value: number) =>
  `a1000000-0000-4000-8000-${value.toString(16).padStart(12, "0")}`;
export const webFixtureCoverId = webFixtureId(902);

/** Synthetic content for browser layout checks. Never production catalog seeding. */
export function publicServiceFixtures(now = new Date()): ServiceDto[] {
  const tomorrow = new Date(now.getTime() + 86_400_000);
  tomorrow.setUTCHours(5, 30, 0, 0);
  const occurrence = (
    serviceId: string,
    index: number,
    remaining: number,
    resourceAvailable = true,
  ): OccurrenceDto => {
    const start = tomorrow.getTime() + index * 86_400_000;
    return {
      id: webFixtureId(300 + index),
      serviceId,
      startAt: new Date(start).toISOString(),
      endAt: new Date(start + 3_600_000).toISOString(),
      capacity: 8,
      remaining,
      resourceAvailable,
      status: "scheduled",
    };
  };
  const service = (
    index: number,
    title: string,
    kind: ServiceDto["kind"],
    amountMinor: string,
    changes: Partial<ServiceDto> = {},
  ): ServiceDto => ({
    id: webFixtureId(index),
    organizationId: webFixtureId(900),
    branchId: webFixtureId(901),
    clubName: "باشگاه نمونه آفتاب",
    branchName: "شعبه نمایشی مرکزی",
    title,
    kind,
    amountMinor,
    description:
      "تمرین با راهنمایی مربی و توجه به سطح هر ورزشکار. این محتوا صرفاً برای بررسی رابط وب است و ثبت‌نام واقعی ندارد.",
    coachName: "مربی نمونه",
    level: "همه سطوح",
    nextStartAt: tomorrow.toISOString(),
    policy: {
      cancellationHours: 12,
      lateRefundBasisPoints: 0,
      noShowConsumesSession: true,
      consumeOn: "attendance",
      freezeDays: 7,
      depositBasisPoints: 0,
      guestAllowance: 0,
      transferable: false,
      terms:
        "لغو تا ۱۲ ساعت پیش از شروع بدون هزینه است. لباس و کفش مناسب همراه داشته باشید. شرایط این نمونه برای آزمون رابط است.",
    },
    eligibility: {
      minimumAge: 18,
      maximumAge: null,
      prerequisites: [
        {
          kind: "equipment",
          description: "لباس راحت و بطری آب همراه داشته باشید.",
        },
      ],
    },
    cover: null,
    durationDays: null,
    sessionCount: null,
    requirements: [],
    occurrences: [],
    status: "published",
    revision: 1,
    ...changes,
  });
  const services = [
    service(1, "یوگا و انعطاف صبحگاهی", "class", "1800000", {
      cover: {
        id: webFixtureCoverId,
        alt: "تصویر نمونهٔ استودیوی ورزشی برای بررسی رابط",
        width: 1672,
        height: 941,
      },
      occurrences: [
        occurrence(webFixtureId(1), 0, 5),
        occurrence(webFixtureId(1), 1, 0),
        occurrence(webFixtureId(1), 2, 8, false),
      ],
    }),
    service(
      2,
      "دوره هشت جلسه‌ای آمادگی جسمانی و تمرین قدرتی",
      "course",
      "9600000",
      {
        level: "مبتدی",
        requirements: ["گواهی آمادگی ورزشی"],
        sessionCount: 8,
        occurrences: Array.from({ length: 8 }, (_, n) =>
          occurrence(webFixtureId(2), 10 + n, 6),
        ),
      },
    ),
    service(3, "زمین بدمینتون · Badminton", "court", "3500000", {
      coachName: "",
      occurrences: [{ ...occurrence(webFixtureId(3), 20, 1), capacity: 1 }],
    }),
    service(4, "بسته هشت جلسه‌ای تمرین", "membership", "12000000", {
      coachName: "",
      nextStartAt: null,
      durationDays: 60,
      sessionCount: 8,
    }),
    service(5, "کلاس در حال برنامه‌ریزی", "class", "2200000", {
      nextStartAt: null,
    }),
  ];
  return services.map((s) => ({
    ...s,
    nextStartAt:
      s.occurrences.find((o) => o.resourceAvailable !== false)?.startAt ?? null,
  }));
}

/** Match the catalog SELECT; detail-only fields must not mask missing UI data. */
export function publicServiceListItem(service: ServiceDto) {
  const {
    id,
    organizationId,
    title,
    kind,
    branchId,
    branchName,
    clubName,
    amountMinor,
    description,
    level,
    coachName,
    eligibility,
    cover,
    nextStartAt,
  } = service;
  return {
    id,
    organizationId,
    title,
    kind,
    branchId,
    branchName,
    clubName,
    amountMinor,
    description,
    level,
    coachName,
    eligibility,
    cover,
    nextStartAt,
  };
}
