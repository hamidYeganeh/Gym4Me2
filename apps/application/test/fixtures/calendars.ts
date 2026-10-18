import type {
  CalendarDto,
  CalendarServiceDto,
  ServiceDto,
} from "@repo/api/sports";
import { publicServiceListItem, webFixtureId } from "./public-services";

/** Synthetic read-only pagination/reflow data; never creates follows or sessions. */
export function calendarFixtures(services: ServiceDto[], now = new Date()) {
  const calendars: CalendarDto[] = Array.from({ length: 23 }, (_, index) => ({
    id: webFixtureId(2401 + index),
    title:
      index === 0
        ? "Ph0Calendar".repeat(16).slice(0, 160)
        : `تقویم تمرین نمایشی ${index + 1}`,
    description: "این تقویم و خدمات آن فقط دادهٔ مصنوعی برای بررسی رابط‌اند.",
    organizationId: webFixtureId(900),
    branchId: webFixtureId(2501 + index),
    clubName: "باشگاه نمایشی تقویم",
    branchName: `شعبهٔ نمایشی ${index + 1}`,
    revision: 1,
    createdAt: new Date(+now - index * 86400000).toISOString(),
    updatedAt: now.toISOString(),
  }));
  const servicesFor = (calendar: CalendarDto): CalendarServiceDto[] => {
    if (!services.length) return [];
    const calendarIndex = calendars.findIndex(({ id }) => id === calendar.id);
    return Array.from({ length: 23 }, (_, index) => ({
      ...publicServiceListItem(services[index % services.length]!),
      id: webFixtureId(3001 + calendarIndex * 100 + index),
      title:
        index === 0
          ? "Ph0Service".repeat(16)
          : `خدمت تمرین نمایشی ${index + 1}`,
      branchId: calendar.branchId,
      branchName: calendar.branchName,
      clubName: calendar.clubName,
    }));
  };
  return {
    calendars,
    servicesFor,
    serviceFor(id: string): ServiceDto | undefined {
      for (const calendar of calendars) {
        const page = servicesFor(calendar);
        const index = page.findIndex((service) => service.id === id);
        if (index < 0) continue;
        const source = services[index % services.length]!;
        return {
          ...source,
          ...page[index]!,
          occurrences: source.occurrences.map((occurrence) => ({
            ...occurrence,
            serviceId: id,
          })),
        };
      }
    },
  };
}
