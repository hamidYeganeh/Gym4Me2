import { normalizeIranianMobile } from "../../../lib/phone.ts";

export type FitnessSession = {
  id: string;
  clubId: string;
  name: string;
  kind: string;
  instructor: string;
  startsAt: string;
  endsAt: string;
  location: string;
  description: string;
  capacity: number;
  price: number;
  approval: boolean;
  waitlist: boolean;
  visibility: string;
  cover: string;
};
export type Reservation = {
  id: string;
  sessionId: string;
  name: string;
  phone: string;
  notes: string;
  status: "confirmed" | "pending" | "waitlisted";
};
export type Schedule = { sessions: FitnessSession[]; reservations: Reservation[] };
const key = "gym4me.schedule.v1";
const event = "gym4me:schedule";
export function subscribe(callback: () => void) {
  const storage = (e: StorageEvent) => {
    if (e.key === key || e.key === null) callback();
  };
  window.addEventListener("storage", storage);
  window.addEventListener(event, callback);
  return () => {
    window.removeEventListener("storage", storage);
    window.removeEventListener(event, callback);
  };
}
export function getSnapshot() {
  try {
    return localStorage.getItem(key) ?? "{}";
  } catch {
    return "{}";
  }
}
export function getServerSnapshot() {
  return null;
}
export function readSchedule(raw: string | null): Schedule {
  try {
    const data = JSON.parse(raw ?? "{}");
    return {
      sessions:
        Array.isArray(data.sessions) ?
          data.sessions.filter(
            (s: FitnessSession) =>
              s &&
              typeof s.id === "string" &&
              typeof s.clubId === "string" &&
              typeof s.name === "string" &&
              Number.isInteger(s.capacity) &&
              s.capacity > 0 &&
              Number.isFinite(Date.parse(s.startsAt)) &&
              Number.isFinite(Date.parse(s.endsAt)),
          )
        : [],
      reservations:
        Array.isArray(data.reservations) ?
          data.reservations
            .filter(
              (r: Reservation) =>
                r &&
                typeof r.id === "string" &&
                typeof r.sessionId === "string" &&
                typeof r.name === "string" &&
                ["confirmed", "pending", "waitlisted"].includes(r.status),
            )
            .map((r: Reservation) => ({
              id: r.id,
              sessionId: r.sessionId,
              name: r.name,
              notes: r.notes ?? "",
              status: r.status,
              phone: typeof r.phone === "string" ? (normalizeIranianMobile(r.phone) ?? "") : "",
            }))
        : [],
    };
  } catch {
    return { sessions: [], reservations: [] };
  }
}
function persist(schedule: Schedule) {
  localStorage.setItem(key, JSON.stringify(schedule));
  window.dispatchEvent(new Event(event));
}
export function occupied(schedule: Schedule, id: string) {
  return schedule.reservations.filter((r) => r.sessionId === id && r.status !== "waitlisted")
    .length;
}
export function validateSession(session: Omit<FitnessSession, "id">, now = Date.now()) {
  if (
    !session.clubId ||
    !session.name.trim() ||
    !session.instructor.trim() ||
    !session.location.trim()
  )
    throw new Error("Add a club, class name, instructor, and training location.");
  const start = Date.parse(session.startsAt),
    end = Date.parse(session.endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start <= now || end <= start)
    throw new Error("Choose a future start time and an end time after the start.");
  if (
    !Number.isInteger(session.capacity) ||
    session.capacity < 1 ||
    !Number.isFinite(session.price) ||
    session.price < 0
  )
    throw new Error("Capacity must be a positive whole number and price cannot be negative.");
}
export function saveSession(session: Omit<FitnessSession, "id">) {
  validateSession(session);
  const data = readSchedule(getSnapshot());
  const created = { ...session, id: crypto.randomUUID() };
  persist({ ...data, sessions: [...data.sessions, created] });
  return created;
}
export function reserve(
  schedule: Schedule,
  input: Omit<Reservation, "id" | "status">,
  now = Date.now(),
): Reservation {
  const session = schedule.sessions.find((s) => s.id === input.sessionId);
  if (!session || Date.parse(session.startsAt) <= now)
    throw new Error("This session is no longer available for reservations.");
  const phone = normalizeIranianMobile(input.phone);
  if (!input.name.trim() || !phone)
    throw new Error("Enter the member’s name and a valid Iranian mobile number.");
  if (
    schedule.reservations.some(
      (r) => r.sessionId === input.sessionId && normalizeIranianMobile(r.phone) === phone,
    )
  )
    throw new Error("This member already has a reservation for this session.");
  const full = occupied(schedule, session.id) >= session.capacity;
  if (full && !session.waitlist) throw new Error("This session is full. Choose another session.");
  return {
    ...input,
    name: input.name.trim(),
    phone,
    id: crypto.randomUUID(),
    status:
      full ? "waitlisted"
      : session.approval ? "pending"
      : "confirmed",
  };
}
export function saveReservation(input: Omit<Reservation, "id" | "status">) {
  const data = readSchedule(getSnapshot());
  const created = reserve(data, input);
  persist({ ...data, reservations: [...data.reservations, created] });
  return created;
}
