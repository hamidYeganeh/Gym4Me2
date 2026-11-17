import { createHttp } from "@repo/api/http";

const origin = process.env.NEXT_PUBLIC_CLUB_API_ORIGIN ?? "http://localhost:3003";
export const coachRequestsHttp = createHttp(new URL("/api/v1/applicant/", origin).href);

export type CoachRequest = {
  id: string;
  fullName: string;
  specialty: string;
  experience: string;
  status: "pending" | "approved" | "rejected" | "needs_changes";
  revision: number;
  reviewNote: string | null;
  updatedAt: string;
};
