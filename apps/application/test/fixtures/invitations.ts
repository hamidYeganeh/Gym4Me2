import type { InvitationDto } from "@repo/api/sports";
import { webFixtureId } from "./public-services";

/** Synthetic invitation metadata only; never issues or delivers an invitation. */
export function invitationFixtures(now = new Date()): InvitationDto[] {
  return Array.from({ length: 29 }, (_, index) => {
    const status: InvitationDto["status"] =
      index < 2
        ? "invited"
        : index < 4
          ? "accepted"
          : index === 5
            ? "cancelled"
            : "declined";
    const createdAt = new Date(+now - index * 3_600_000).toISOString();
    return {
      id: webFixtureId(1301 + index),
      title: `دعوت تمرین گروهی و یوگای صبحگاهی · نمونهٔ وب ${index + 1}`,
      serviceId: webFixtureId(1),
      status,
      revision: 1,
      userId: webFixtureId(1400),
      displayName: "ورزشکار نمایشی",
      phoneSuffix: "0000",
      clubName: "باشگاه نمونه آفتاب",
      branchName: "شعبه نمایشی مرکزی",
      available: index !== 1 && index !== 3,
      createdAt,
      updatedAt: createdAt,
    };
  });
}
