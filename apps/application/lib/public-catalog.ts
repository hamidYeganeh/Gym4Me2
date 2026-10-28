import { belongsToClubClass } from "./club-class-route";
import { cache } from "react";
import { notFound } from "next/navigation";
import { createApiClient, ApiError } from "@repo/api";
import { catalogClients } from "@repo/api/catalog";

export const getPublicClub = cache(async (id: string) => {
  if (!/^[a-z0-9-]{3,120}$/.test(id)) notFound();
  const api = createApiClient({
    application: "application",
    locale: "fa",
    baseUrl: `${(process.env.API_URL ?? "http://localhost:7088").replace(/\/$/, "")}/api/v1`,
  });
  try {
    return await catalogClients.club(api, id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
});

export const getPublicClubClass = cache(
  async (clubId: string, classId: string) => {
    const club = await getPublicClub(clubId);
    if (!/^[a-z0-9-]{3,120}$/.test(classId)) notFound();
    const api = createApiClient({
      application: "application",
      locale: "fa",
      baseUrl: `${(process.env.API_URL ?? "http://localhost:7088").replace(/\/$/, "")}/api/v1`,
    });
    try {
      const service = await api.request<import("@repo/api/sports").ServiceDto>({
        method: "GET",
        path: `sports/services/${classId}`,
      });
      if (!belongsToClubClass(service, club.id)) notFound();
      return { club, service };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) notFound();
      throw error;
    }
  },
);

/** Server reads are handed straight to the matching client query to avoid a second loading phase. */
const getPublicResource = cache(
  async (kind: "coach" | "service", reference: string) => {
    if (!/^[a-z0-9-]{3,120}$/.test(reference)) notFound();
    const api = createApiClient({
      application: "application",
      locale: "fa",
      baseUrl: `${(process.env.API_URL ?? "http://localhost:7088").replace(/\/$/, "")}/api/v1`,
    });
    try {
      return await api.request<
        | import("@repo/api/profile").CoachDetailDto
        | import("@repo/api/sports").ServiceDto
      >({
        method: "GET",
        path:
          kind === "coach"
            ? `coaching/directory/${reference}`
            : `sports/services/${reference}`,
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) notFound();
      throw error;
    }
  },
);
export const getPublicCoach = (reference: string) =>
  getPublicResource("coach", reference) as Promise<
    import("@repo/api/profile").CoachDetailDto
  >;
export const getPublicService = (reference: string) =>
  getPublicResource("service", reference) as Promise<
    import("@repo/api/sports").ServiceDto
  >;

export const getPublicClubBranch = cache(async (reference: string) => {
  const club = await getPublicClub(reference);
  const branch = club.branches.find((item) => item.isMain) ?? club.branches[0];
  if (!branch) return undefined;
  const api = createApiClient({
    application: "application",
    locale: "fa",
    baseUrl: `${(process.env.API_URL ?? "http://localhost:7088").replace(/\/$/, "")}/api/v1`,
  });
  try {
    return await catalogClients.branch(api, club.id, branch.id);
  } catch {
    return undefined;
  } // Keep the club readable; the branch query provides its own retry.
});
