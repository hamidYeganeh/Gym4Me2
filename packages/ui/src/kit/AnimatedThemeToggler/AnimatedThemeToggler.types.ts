import type { ButtonProps } from "../Button";
import type { TransitionVariant } from "@repo/theme/transition";
export type AnimatedThemeTogglerVariants = TransitionVariant;
export type AnimatedThemeTogglerProps = Omit<
  ButtonProps,
  "variant" | "onClick" | "children" | "asChild"
> & {
  label: string;
  variant?: TransitionVariant;
  duration?: number;
  fromCenter?: boolean;
};
