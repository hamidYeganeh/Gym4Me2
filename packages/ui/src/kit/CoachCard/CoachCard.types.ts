import type { SocialLink } from "../SocialIcon";
import type { VariantProps } from "class-variance-authority";
import type { coachCardVariants } from "./CoachCard.styles";

export type CoachSummary = {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  reviews: number;
  certified: boolean;
  yearsOfExperience: number;
  isNew?: boolean;
  photo?: { src: string; alt: string };
  socialLinks?: SocialLink[];
};
export type CoachCardVariants = VariantProps<typeof coachCardVariants>;
export type CoachCardProps = CoachCardVariants & {
  coach: Omit<CoachSummary, "rating" | "reviews"> &
    Partial<Pick<CoachSummary, "rating" | "reviews">>;
  labels: {
    new: string;
    save: string;
    unsave: string;
    certified: string;
    experience: string;
    rating: string;
  };
  locale?: string;
  href?: string;
  saved?: boolean;
  onSavedChange?: (saved: boolean) => void;
  badgeLabel?: string;
  compact?: boolean;
  className?: string;
  priority?: boolean;
};
