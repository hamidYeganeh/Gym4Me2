import type { ClubBranch } from "../ClubBranchCard";
import type { ClubSummary } from "../ClubCard";
import type { ReactNode } from "react";

export type ClubDetailData = ClubSummary & {
  logo?: string;
  branches?: ClubBranch[];
  categories?: string[];
  priceValue: number | null;
  coordinates?: [longitude: number, latitude: number];
  categoryIds?: string[];
  cityId?: string | null;
  cityName?: string | null;
  priceCurrency: string;
  locale: string;
  description: string;
  hours: string;
  distance: string;
  userDistance?: string;
  coachCount: number;
  amenities: {
    id: string;
    icon?: "weights" | "coaching" | "showers" | "wifi" | "group" | "air";
    image?: string;
    label: string;
    description: string;
  }[];
};
export type ClubDetailProps = {
  club: ClubDetailData;
  saved: boolean;
  onSavedChange: (saved: boolean) => void;
  onShare: () => void;
  onPlanVisit?: () => void;
  coaches?: ReactNode;
  reviews?: ReactNode;
  faq?: ReactNode;
  availability?: ReactNode;
  galleryPreview?: ReactNode;
  socialShare?: ReactNode;
  categories?: ReactNode;
  branches?: ReactNode;
  recommendations?: ReactNode;
  labels: Record<
    | "back"
    | "save"
    | "unsave"
    | "share"
    | "photo"
    | "about"
    | "amenities"
    | "hours"
    | "distance"
    | "distanceUnavailable"
    | "coachCount"
    | "reviews"
    | "visit"
    | "perVisit"
    | "gallery"
    | "seeMore"
    | "seeLess",
    string
  >;
};
