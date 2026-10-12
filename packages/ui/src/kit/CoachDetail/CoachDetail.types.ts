import type { CoachSummary } from "../CoachCard";
export type CoachDetailData = CoachSummary & {
  clubId: string;
  clubName: string;
  location: string;
  description: string;
  photos: { src: string; alt: string }[];
};
export type CoachDetailProps = {
  coach: CoachDetailData;
  locale: string;
  saved: boolean;
  onSavedChange: (saved: boolean) => void;
  labels: {
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
