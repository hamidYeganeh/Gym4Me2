import type { VariantProps } from "class-variance-authority";
import type { classCardVariants } from "./ClassCard.styles";
export type ClassSummary = {
  id: string;
  title: string;
  level: string;
  coachName: string;
  calories: number;
  minutes: number;
  score: number;
  photo?: { src: string; alt: string };
};
export type ClassCardVariants = VariantProps<typeof classCardVariants>;
export type ClassCardProps = ClassCardVariants & {
  classItem: ClassSummary;
  labels: {
    save: string;
    unsave: string;
    calories: string;
    minutes: string;
    score: string;
  };
  locale?: string;
  href?: string;
  saved?: boolean;
  onSavedChange?: (saved: boolean) => void;
  className?: string;
  priority?: boolean;
};
