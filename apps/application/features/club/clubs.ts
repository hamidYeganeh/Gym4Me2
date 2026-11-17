import type { PublicClub } from "./api";
import type { ClubReview } from "./reviews";

import { clubMediaUrl } from "./api";

export type FitnessClub = {
  published?: PublicClub;
  id: string;
  name: string;
  neighborhood: string;
  description: string;
  hours: string;
  reviewEntries: ClubReview[];
  highlights: { title: string; description: string }[];
  locationDescription: string;
  owner: {
    name: string;
    role: string;
    founded: string;
    coachingSince: string;
    bio: string;
    languages: string[];
    availability: string;
  };
  monthlyPrice: string;
  amenities: string[];
  photos: { src: string; alt: string; label: string }[];
};

export const demoClubId = "form-fitness";
export const fromPublicClub = (club: PublicClub): FitnessClub => ({
  id: club.id,
  name: club.title,
  neighborhood: club.location.address,
  description: club.description,
  published: club,
  hours: "",
  reviewEntries: [],
  highlights: [],
  locationDescription: "",
  monthlyPrice: "",
  owner: {
    name: "",
    role: "",
    founded: "",
    coachingSince: "",
    bio: "",
    languages: [],
    availability: "",
  },
  amenities: club.amenities.map(({ id, description }) =>
    [club.labels[id], description].filter(Boolean).join(" · "),
  ),
  photos: club.gallery
    .filter((item) => item.contentType.startsWith("image/"))
    .map((item) => ({
      src: clubMediaUrl(club.id, item.hash),
      alt: item.description || item.title,
      label: item.title,
    })),
});
