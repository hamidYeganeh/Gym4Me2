import type {
  PracticeSessionDto,
  PracticeWorkspaceDto,
  PracticeParticipantDto,
} from "@repo/api/profile";
import { webFixtureId } from "./public-services";

/** Synthetic data for the existing development-only route preview. */
export function coachingSessionFixtures(now = new Date()) {
  const time = (hours: number) =>
    new Date(+now + hours * 3600000).toISOString();
  const session = (
    i: number,
    status: string,
    hours: number,
  ): PracticeSessionDto => ({
    id: webFixtureId(9300 + i),
    occurrenceId: webFixtureId(9400 + i),
    occurrenceRevision: 1,
    revision: 1,
    title: "قدرت و تعادل · Strength & balance",
    clubName: "باشگاه آبان",
    branchName: "شعبهٔ مرکزی",
    startAt: time(hours),
    endAt: time(hours + 1),
    occurrenceStatus: "scheduled",
    status,
    displayName: "آرین محمدی",
    userId: webFixtureId(9999),
  });
  const sessions = [
    session(1, "completed", -168),
    session(2, "completed", -96),
    session(3, "confirmed", -0.25),
    session(4, "confirmed", 48),
    { ...session(5, "cancelled", 72), occurrenceStatus: "cancelled" },
  ];
  const membership = {
    id: webFixtureId(9500),
    title: "بستهٔ ۱۲ جلسهٔ مربیگری",
    granted: 12,
    consumed: 5,
    held: 2,
    endsAt: time(720),
    status: "active",
  };
  const workspace: PracticeWorkspaceDto = {
    practice: null,
    credentials: [],
    availability: [],
    notes: [],
    services: [
      {
        id: webFixtureId(9600),
        kind: "class",
        title: sessions[0]!.title,
        branchName: "شعبهٔ مرکزی",
        clubName: "باشگاه آبان",
        mode: "private",
        entryAmountMinor: "0",
        amountMinor: "2500000",
      },
    ],
    sessions,
    studentSessions: sessions.map((s) => ({ ...s, displayName: "نرگس رضایی" })),
    sessionSummary: { total: 5, completed: 2, upcoming: 1 },
    studentMemberships: [membership],
  };
  const roster = (occurrenceId: string): PracticeParticipantDto[] =>
    sessions
      .filter(
        (s) => s.occurrenceId === occurrenceId && s.status !== "cancelled",
      )
      .map((s) => ({
        id: s.id!,
        revision: s.revision!,
        displayName: s.displayName,
        status: s.status!,
        checkedInAt: s.status === "confirmed" ? time(-0.5) : null,
        attendance: s.status === "completed" ? "present" : null,
        paymentStatus: "paid",
        membershipId: membership.id,
        granted: 12,
        consumed: 5,
        held: 2,
      }));
  return { workspace, sessions, roster };
}
