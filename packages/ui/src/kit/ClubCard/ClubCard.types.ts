import type { VariantProps } from "class-variance-authority";
import type { clubCardStyles } from "./ClubCard.styles";

export type ClubPhoto = { src: string; alt: string };
export type ClubSummary = {
  id: string;
  href?: string;
  name: string;
  category: string;
  address: string;
  price: string;
  pricePeriod: string;
  rating: string;
  reviews: string;
  photos: [ClubPhoto, ...ClubPhoto[]];
  facilities: [string, string, string];
};
export type ClubCardVariants = VariantProps<typeof clubCardStyles.root>;
export type ClubCardProps = ClubCardVariants & {
  club: ClubSummary;
  saved?: boolean;
  onSavedChange?: (saved: boolean) => void;
  labels: { save: string; unsave: string; discover: string };
  className?: string;
  priority?: boolean;
  featuredLabel?: string;
  galleryLabel?: string;
  photoLabel?: string;
};
