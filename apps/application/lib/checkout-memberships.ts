import type { MembershipDto, ServiceDto } from "@repo/api/sports";

export function remainingMembershipSessions(
  membership: Pick<MembershipDto, "granted" | "consumed" | "held">,
) {
  return membership.granted === null
    ? null
    : Math.max(0, membership.granted - membership.consumed - membership.held);
}

/** Advisory filtering; the server rechecks expiry and balance under lock. */
export function usableCheckoutMemberships(
  service: Pick<
    ServiceDto,
    "organizationId" | "branchId" | "kind" | "occurrences"
  >,
  memberships: MembershipDto[],
  now = Date.now(),
) {
  const required =
    service.kind === "course" ? Math.max(1, service.occurrences.length) : 1;
  return memberships.filter((membership) => {
    if (
      membership.organizationId !== service.organizationId ||
      membership.branchId !== service.branchId ||
      membership.status !== "active"
    )
      return false;
    if (membership.endsAt !== null && !(Date.parse(membership.endsAt) > now))
      return false;
    if (
      membership.freezeUntil !== null &&
      !(Date.parse(membership.freezeUntil) <= now)
    )
      return false;
    const remaining = remainingMembershipSessions(membership);
    return remaining === null || remaining >= required;
  });
}
