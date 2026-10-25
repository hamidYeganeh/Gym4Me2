import type { ClubSummary } from "@repo/ui/kit/ClubCard";

export interface LandingClub {
  club: ClubSummary;
  id: string;
  title: string;
  titleLines: readonly string[];
  region: string;
  description: string;
  coordinates: string;
  image: string;
  thumbnail: string;
  href: string;
}

export interface LandingClubsSectionProps {
  items?: readonly LandingClub[];
  autoPlay?: boolean;
  interval?: number;
  className?: string;
}
