import { cache } from "react";
import { notFound } from "next/navigation";
import { createApiClient, ApiError } from "@repo/api";
import { catalogClients } from "@repo/api/catalog";

export const getPublicClub = cache(async (id: string) => {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  )
    notFound();
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
