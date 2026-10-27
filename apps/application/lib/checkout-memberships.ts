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
    "id" | "organizationId" | "branchId" | "kind" | "occurrences"
  >,
  memberships: MembershipDto[],
  now = Date.now(),
) {
  const required =
    service.kind === "course" ? Math.max(1, service.occurrences.length) : 1;
  return memberships.filter((membership) => {
    if (
      membership.organizationId !== service.organizationId ||
      (membership.sharedServiceIds?.length
        ? !membership.sharedServiceIds.includes(service.id)
        : membership.branchId !== service.branchId ||
          !membership.offering?.includedServiceIds.includes(service.id)) ||
      membership.status !== "active"
    )
      return false;
    if (membership.startsAt && !(Date.parse(membership.startsAt) <= now))
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

/** A renewal belongs to this service and beneficiary; credit for other services is unrelated. */
export function renewableCheckoutMemberships(
  service: Pick<ServiceDto, "id" | "kind">,
  memberships: MembershipDto[],
  dependentId = "",
) {
  if (service.kind !== "membership") return [];
  return memberships.filter(
    (membership) =>
      membership.serviceId === service.id &&
      (membership.dependentId ?? "") === dependentId &&
      ["active", "expired", "frozen"].includes(membership.status),
  );
}
