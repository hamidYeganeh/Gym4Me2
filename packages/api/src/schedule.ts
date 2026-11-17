"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type ScheduleClub = {
  id: string;
  name: string;
  cover: string;
  address: string;
  canWrite: boolean;
};

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
type ScheduleResponse = Schedule & { clubs: ScheduleClub[] };

export const dashboardGeographyKey = ["admin", "dashboard", "geography"] as const;
const scheduleKey = ["club-schedule"] as const;

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch("/api/schedule" + url, { ...init, cache: "no-store" });
  if (response.ok) return response.json() as Promise<T>;
  const body = (await response.json().catch(() => null)) as { message?: unknown } | null;
  throw new Error(
    typeof body?.message === "string" ? body.message : "Could not load or save the schedule.",
  );
}

export function useSchedule() {
  return useQuery({
    queryKey: scheduleKey,
    queryFn: ({ signal }) => request<ScheduleResponse>("", { signal }),
    retry: false,
  });
}

function useCreateScheduleEntry<TInput, TOutput>(path: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: TInput) =>
      request<TOutput>(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: scheduleKey }),
        client.invalidateQueries({ queryKey: dashboardGeographyKey }),
      ]);
    },
  });
}

export function useCreateClass() {
  return useCreateScheduleEntry<Omit<FitnessSession, "id">, FitnessSession>("/classes");
}

export function useCreateReservation() {
  return useCreateScheduleEntry<Omit<Reservation, "id" | "status">, Reservation>("/reservations");
}

export function occupied(schedule: Schedule, id: string) {
  return schedule.reservations.filter((r) => r.sessionId === id && r.status !== "waitlisted")
    .length;
}
