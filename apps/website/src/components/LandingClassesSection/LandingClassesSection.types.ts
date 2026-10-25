import type { ClassSummary } from "@repo/ui/kit/ClassCard";

export interface LandingClass extends ClassSummary {
  slug: string;
  description: string;
  tags: readonly string[];
}

export interface LandingClassesSectionProps {
  id?: string;
  className?: string;
  items?: readonly LandingClass[];
  initialIndex?: number;
  autoPlay?: boolean;
  interval?: number;
  showNavigation?: boolean;
}

export interface ClassLayout {
  cardW: number;
  cardH: number;
  centerY: number;
  angle: number;
  origin: number;
  sensitivity: number;
}

export interface ClassSelection {
  item: LandingClass;
  slot: number;
  origin: { left: number; top: number; width: number; height: number };
  rotation: number;
  scale: number;
  trigger: HTMLButtonElement;
}
