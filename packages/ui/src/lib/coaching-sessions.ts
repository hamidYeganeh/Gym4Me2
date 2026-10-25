import type { PracticeSessionDto } from "@repo/api/profile";

export type CoachingSessionGroup = {
  session: PracticeSessionDto;
  reservations: PracticeSessionDto[];
  status: string;
};

/** One class is one timeline stop, even when it has several reservations. */
export function groupCoachingSessions(sessions: PracticeSessionDto[]) {
  const groups = new Map<string, CoachingSessionGroup>();
  for (const session of sessions) {
    let group = groups.get(session.occurrenceId);
    if (!group) {
      group = { session, reservations: [], status: session.occurrenceStatus };
      groups.set(session.occurrenceId, group);
    }
    if (session.id) group.reservations.push(session);
  }
  for (const group of groups.values()) {
    if (group.session.occurrenceStatus === "cancelled") continue;
    const statuses = group.reservations.map((s) => s.status);
    group.status = statuses.includes("pending_approval")
      ? "pending_approval"
      : statuses.includes("confirmed")
        ? "confirmed"
        : statuses.length && statuses.every((s) => s === "no_show")
          ? "no_show"
          : statuses.length &&
              statuses.every((s) => s === "completed" || s === "no_show")
            ? "completed"
            : "scheduled";
  }
  return [...groups.values()];
}

export function nextCoachingSession(
  groups: CoachingSessionGroup[],
  now: number,
) {
  return groups
    .filter(
      (g) =>
        ["scheduled", "confirmed"].includes(g.status) &&
        Date.parse(g.session.endAt) > now,
    )
    .reduce<CoachingSessionGroup | undefined>(
      (next, g) =>
        !next ||
        Date.parse(g.session.startAt) < Date.parse(next.session.startAt)
          ? g
          : next,
      undefined,
    )?.session.occurrenceId;
}

export function coachingSessionBalance(
  granted: number | null,
  consumed: number,
  held: number,
) {
  return granted === null ? null : Math.max(0, granted - consumed - held);
}
