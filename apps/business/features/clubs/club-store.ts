import type { ClubProfile } from "./club-profile";

export type { ClubProfile } from "./club-profile";

export type Club = ClubProfile & {
  id: string;
  updatedAt: string;
  reviewStatus?: "pending" | "approved" | "rejected";
  rejectionReason?: string | null;
  publishedAt?: string | null;
};

const key = "gym4me.clubs.v1";
const changeEvent = "gym4me:clubs";

export function subscribe(onChange: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key === key || event.key === null) onChange();
  }
  window.addEventListener("storage", onStorage);
  window.addEventListener(changeEvent, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(changeEvent, onChange);
  };
}

export function getSnapshot() {
  try {
    return window.localStorage.getItem(key) ?? "[]";
  } catch {
    return "[]";
  }
}

export function getServerSnapshot() {
  return null;
}

export function readClubs(snapshot: string): Club[] {
  try {
    const clubs: unknown = JSON.parse(snapshot);
    if (Array.isArray(clubs))
      return clubs.filter(
        (club): club is Club =>
          club &&
          ["id", "name", "location", "description", "cover", "logo", "updatedAt"].every(
            (field) => typeof club[field] === "string",
          ),
      );
  } catch {
    // A malformed browser snapshot is treated as an empty directory.
  }
  return [];
}

export function saveClub(profile: ClubProfile, id?: string) {
  const clubs = readClubs(window.localStorage.getItem(key) ?? "[]");
  if (id && !clubs.some((club) => club.id === id)) {
    throw new Error("This club is no longer available.");
  }

  const club = {
    ...profile,
    id: id ?? crypto.randomUUID(),
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(
    key,
    JSON.stringify([club, ...clubs.filter((entry) => entry.id !== club.id)]),
  );
  window.dispatchEvent(new Event(changeEvent));
  return club.id;
}
