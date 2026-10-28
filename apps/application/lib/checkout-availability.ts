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
  quantity: number,
): CheckoutIssue | null {
  const start = Date.parse(session.startAt);
  if (session.status !== "scheduled" || !Number.isFinite(start) || start <= now)
    return "checkoutSessionUnavailable";
  if (session.resourceAvailable === false) return "resourceUnavailableSlot";
  if (session.remaining < quantity) return "checkoutSessionFull";
  return null;
}

/** Advisory UI check only. The server still allocates capacity transactionally. */
export function checkoutIssue(
  service: Pick<ServiceDto, "kind" | "occurrences">,
  occurrenceId: string | null,
  now = Date.now(),
  quantity = 1,
): CheckoutIssue | null {
  if (["membership", "program"].includes(service.kind)) return null;
  const selected = service.occurrences.find((item) => item.id === occurrenceId);
  if (!selected) return "checkoutChooseSession";
  const issue = sessionIssue(selected, now, quantity);
  if (issue) return issue;
  if (
    service.kind === "course" &&
    service.occurrences.some(
      (item) =>
        (!selected.seriesId || item.seriesId === selected.seriesId) &&
        sessionIssue(item, now, quantity) !== null,
    )
  )
    return "checkoutCourseUnavailable";
  return null;
}
