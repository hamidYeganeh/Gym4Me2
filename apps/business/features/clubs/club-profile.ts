import type { ClubLocation } from "@repo/ui/lib/club-location-fields";

export type ClubAssignment = { id: string; description: string };
export type ClubSport = { categoryId: string; sportId: string; subSportId: string | null };
export type ClubGalleryItem = {
  hash: string;
  contentType: string;
  title: string;
  description: string;
  typeId: string;
};

export type ClubProfile = {
  name: string;
  title?: string;
  type?: string;
  clubTypeId?: string;
  location: string | ClubLocation;
  description: string;
  cover: string;
  logo: string;
  sports?: ClubSport[];
  equipment?: ClubAssignment[];
  amenities?: ClubAssignment[];
  gallery?: ClubGalleryItem[];
  labels?: Record<string, string>;
};

export function clubAddress(location: ClubProfile["location"]) {
  return typeof location === "string" ? location : location.address;
}
