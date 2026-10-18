import type { MembershipDto, ServiceDto } from "@repo/api/sports";
import { webFixtureId } from "./public-services";

/** Synthetic DTOs only; no user, session, token or real account is created. */
export function checkoutMembershipFixtures(
  services: ServiceDto[],
  now = new Date(),
): MembershipDto[] {
  const service = services[0]!;
  const membership = (
    index: number,
    title: string,
    changes: Partial<MembershipDto> = {},
  ): MembershipDto => ({
    id: webFixtureId(1000 + index),
    title,
    serviceId: webFixtureId(4),
    organizationId: service.organizationId,
    branchId: service.branchId,
    status: "active",
    revision: 1,
    granted: 12,
    held: 2,
    consumed: 2,
    endsAt: new Date(+now + 60 * 86_400_000).toISOString(),
    freezeUntil: null,
    policy: service.policy,
    events: [],
    ...changes,
  });
  return [
    membership(1, "بستهٔ نمایشی هشت جلسهٔ باقی‌مانده"),
    membership(2, "بستهٔ نمایشی یک جلسه", { granted: 5 }),
    membership(3, "بستهٔ نمایشی نامحدود", { granted: null, endsAt: null }),
    membership(4, "بستهٔ منقضی", { endsAt: new Date(+now - 1).toISOString() }),
    membership(5, "بستهٔ فریز", {
      status: "frozen",
      freezeUntil: new Date(+now + 86_400_000).toISOString(),
    }),
    membership(6, "بستهٔ مصرف‌شده", { granted: 4 }),
    membership(7, "بستهٔ شعبهٔ دیگر", { branchId: webFixtureId(903) }),
    membership(8, "بستهٔ سازمان دیگر", { organizationId: webFixtureId(904) }),
  ];
}
