import type { NotificationDto } from "@repo/api/sports";
import { webFixtureId } from "./public-services";

/** Synthetic inbox metadata; no notification is sent or marked as read. */
export function notificationFixtures(now = new Date()): NotificationDto[] {
  return Array.from({ length: 29 }, (_, index) => ({
    id: webFixtureId(1501 + index),
    title: `یادآوری تمرین گروهی · نمونهٔ وب ${index + 1}`,
    body: "اطلاعات نمایشی برای بررسی فهرست اعلان‌ها و دسترسی با کیبورد.",
    href: `/services/detail?id=${webFixtureId(1)}`,
    readAt: index % 5 === 0 ? now.toISOString() : null,
    createdAt: new Date(+now - index * 3_600_000).toISOString(),
  }));
}
