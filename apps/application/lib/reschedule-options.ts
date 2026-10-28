import type { OccurrenceDto } from "@repo/api/sports";

/** Match the server's quantity and availability checks before offering a move. */
export function rescheduleOptions(
  occurrences: readonly OccurrenceDto[],
  currentId: string,
  quantity = 1,
  now = Date.now(),
) {
  return occurrences.filter(
    (item) =>
      item.id !== currentId &&
      item.status === "scheduled" &&
      Date.parse(item.startAt) > now &&
      item.remaining >= quantity &&
      item.resourceAvailable !== false,
  );
}
