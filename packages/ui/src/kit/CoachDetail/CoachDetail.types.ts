import type { ReactNode } from "react";
import type { CoachSummary } from "../CoachCard";
export type CoachDetailData = CoachSummary & {
  clubId: string;
  clubName: string;
  location: string;
  description: string;
  specialties?: string[];
  goals?: string[];
  priceLabel?: string;
  photos: { src: string; alt: string }[];
};
export type CoachDetailProps = {
  coach: CoachDetailData;
  locale: string;
  saved: boolean;
  onSavedChange: (saved: boolean) => void;
  samples?: ReactNode;
  services?: ReactNode;
  reviews?: ReactNode;
  onBook?: () => void;
  onShare?: () => void;
  labels: {
    book?: string;
    share?: string;
    back: string;
    save: string;
    unsave: string;
    gallery: string;
    photo: string;
    rating: string;
    experience: string;
    certified: string;
    about: string;
    club: string;
  };
};
