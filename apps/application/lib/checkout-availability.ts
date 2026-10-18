import type { ServiceDto, OccurrenceDto } from "@repo/api/sports";

export type CheckoutIssue =
  | "checkoutChooseSession"
  | "checkoutSessionUnavailable"
  | "checkoutSessionFull"
  | "resourceUnavailableSlot"
  | "checkoutCourseUnavailable";

function sessionIssue(
  session: OccurrenceDto,
  now: number,
): CheckoutIssue | null {
  const start = Date.parse(session.startAt);
  if (session.status !== "scheduled" || !Number.isFinite(start) || start <= now)
    return "checkoutSessionUnavailable";
  if (session.resourceAvailable === false) return "resourceUnavailableSlot";
  if (session.remaining <= 0) return "checkoutSessionFull";
  return null;
}

/** Advisory UI check only. The server still allocates capacity transactionally. */
export function checkoutIssue(
  service: Pick<ServiceDto, "kind" | "occurrences">,
  occurrenceId: string | null,
  now = Date.now(),
): CheckoutIssue | null {
  if (service.kind === "membership") return null;
  const selected = service.occurrences.find((item) => item.id === occurrenceId);
  if (!selected) return "checkoutChooseSession";
  const issue = sessionIssue(selected, now);
  if (issue) return issue;
  if (
    service.kind === "course" &&
    service.occurrences.some((item) => sessionIssue(item, now) !== null)
  )
    return "checkoutCourseUnavailable";
  return null;
}
