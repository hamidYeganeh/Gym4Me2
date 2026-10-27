import type { MembershipDto } from "@repo/api/sports";

export function membershipAccess(m: MembershipDto, now: number) {
  if (m.paymentOverdue) return "paymentOverdue";
  if (m.status !== "active") return m.status;
  if (m.startsAt && !(Date.parse(m.startsAt) <= now)) return "notStarted";
  if (m.endsAt && !(Date.parse(m.endsAt) > now)) return "expired";
  if (m.granted !== null && m.granted - m.consumed - m.held <= 0)
    return "exhausted";
  if (m.offering?.entryAllowed === false) return "reservationRequired";
  return "active";
}
