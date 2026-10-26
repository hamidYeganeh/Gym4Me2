import { getTranslator } from "@repo/i18n/messages";
import type { LandingClass } from "./LandingClassesSection.types";

// Illustrative fitness classes for the landing preview, not live availability.
const records = [
  { id: "strength", calories: 320, minutes: 45, score: 80, image: "strength" },
  { id: "mobility", calories: 140, minutes: 30, score: 50, image: "studio" },
  {
    id: "functional",
    calories: 380,
    minutes: 50,
    score: 90,
    image: "training",
  },
  { id: "cardio", calories: 280, minutes: 40, score: 70, image: "studio" },
  {
    id: "foundation",
    calories: 220,
    minutes: 45,
    score: 60,
    image: "strength",
  },
] as const;

export function getLandingClasses(locale: string): readonly (LandingClass & {
  calories: number;
  minutes: number;
  score: number;
})[] {
  const t = getTranslator(locale);
  return records.map((item) => ({
    ...item,
    slug: item.id,
    title: t(`Website.classes.fitness.items.${item.id}.title`),
    coachName: t(`Website.classes.fitness.items.${item.id}.coach`),
    level: t(`Website.classes.fitness.items.${item.id}.level`),
    description: t(`Website.classes.fitness.items.${item.id}.description`),
    tags: [t("Preview.proEquipment"), t("Preview.personalCoaching")],
    photo: {
      src: `/images/clubs/${item.image}.webp`,
      alt: t(`Website.classes.fitness.items.${item.id}.title`),
    },
  }));
}
