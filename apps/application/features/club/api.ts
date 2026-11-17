import { createHttp } from "@repo/api/http";

export const clubApiOrigin = process.env.NEXT_PUBLIC_CLUB_API_ORIGIN ?? "http://localhost:3003";
const request = createHttp(new URL("/api/v1/public/clubs/", clubApiOrigin).href);
export type ClubSummary = {
  id: string;
  title: string;
  address: string;
  cover?: string | null;
  coverHash?: string | null;
};
export type PublicClub = {
  id: string;
  title: string;
  description: string;
  clubTypeId: string;
  cover?: string;
  location: {
    address: string;
    lat: number;
    lng: number;
    cityId: string;
    provinceId: string;
    districtId: string | null;
    neighborhoodId: string | null;
  };
  labels: Record<string, string>;
  sports: { sportId: string; categoryId: string; subSportId: string | null }[];
  equipment: { id: string; description: string }[];
  amenities: { id: string; description: string }[];
  gallery: {
    hash: string;
    title: string;
    description: string;
    typeId: string;
    contentType: string;
  }[];
};
export const clubMediaUrl = (id: string, hash: string) =>
  new URL(
    `/api/v1/public/clubs/${encodeURIComponent(id)}/media/${encodeURIComponent(hash)}`,
    clubApiOrigin,
  ).href;
export const listClubs = (signal: AbortSignal) => request<ClubSummary[]>({ url: "", signal });
export const getClub = (id: string, signal: AbortSignal) =>
  request<PublicClub>({ url: encodeURIComponent(id), signal });
