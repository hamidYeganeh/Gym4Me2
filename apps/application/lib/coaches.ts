import { getTranslator } from "@repo/i18n/messages";
import type { CoachSummary } from "@repo/ui/kit/CoachCard";

// Illustrative profiles until club-specific coach records are connected to the API.
export function getCoaches(locale: string, clubId: string): CoachSummary[] {
  const text = getTranslator(locale);
  return [
    {
      id: `${clubId}-strength`,
      name: text("Preview.armanRezaei"),
      specialty: text("Preview.strengthLowerBody"),
      photo: {
        src: "/images/clubs/strength.png",
        alt: text("Preview.strengthTrainingSpace"),
      },
      rating: 4.5,
      reviews: 90,
      certified: true,
      yearsOfExperience: 5,
      isNew: true,
    },
    {
      id: `${clubId}-movement`,
      name: text("Preview.nikaAhmadi"),
      specialty: text("Preview.fitnessMovement"),
      photo: {
        src: "/images/clubs/studio.png",
        alt: text("Preview.fitnessStudio"),
      },
      rating: 4.8,
      reviews: 64,
      certified: true,
      yearsOfExperience: 7,
    },
    {
      id: `${clubId}-functional`,
      name: text("Preview.samanKarimi"),
      specialty: text("Preview.functionalTraining2"),
      photo: {
        src: "/images/clubs/training.png",
        alt: text("Preview.functionalTrainingSpace"),
      },
      rating: 4.2,
      reviews: 48,
      certified: true,
      yearsOfExperience: 4,
    },
  ];
}
