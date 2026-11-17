import { cn } from "tailwind-variants";

import type { ClassProp } from "tailwind-variants";

import { tv } from "../../lib/variants";

export const cardSlots = tv({
  slots: {
    root: cn("flex flex-col gap-theme-stack", "bg-theme-card text-theme-card-foreground"),
    action: cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end"),
    content: cn("text-theme-body1 font-theme-normal"),
    description: cn("text-theme-body2 text-theme-muted-foreground"),
    footer: cn("flex items-center gap-theme-2"),
    header: cn(
      "grid auto-rows-min items-start gap-theme-2",
      "has-data-[slot=card-action]:grid-cols-[1fr_auto]",
    ),
    title: cn("text-theme-h5 font-theme-semibold"),
  },
  variants: {
    variant: {
      outlined: { root: "border border-theme-border" },
      elevated: { root: "shadow-theme-md" },
      flat: { root: "border-0 shadow-theme-none" },
    },
    radius: {
      none: { root: "rounded-theme-none" },
      xs: { root: "rounded-theme-xs" },
      sm: { root: "rounded-theme-sm" },
      md: { root: "rounded-theme-md" },
      lg: { root: "rounded-theme-lg" },
      xl: { root: "rounded-theme-xl" },
      "2xl": { root: "rounded-theme-2xl" },
      "3xl": { root: "rounded-theme-3xl" },
      full: { root: "rounded-theme-full" },
    },
    size: {
      xs: { root: "p-theme-2" },
      sm: { root: "p-theme-3" },
      md: { root: "p-theme-4" },
      lg: { root: "p-theme-6" },
      xl: { root: "p-theme-8" },
    },
    shadow: {
      none: { root: "shadow-theme-none" },
      xs: { root: "shadow-theme-xs" },
      sm: { root: "shadow-theme-sm" },
      md: { root: "shadow-theme-md" },
      lg: { root: "shadow-theme-lg" },
      xl: { root: "shadow-theme-xl" },
    },
  },
  defaultVariants: { variant: "outlined", radius: "xl", size: "md" },
});

// Compatibility helpers retain the existing per-part recipe API.
export const cardVariants = cardSlots;
export const cardActionVariants = ({ class: classValue, className, ...props }: ClassProp = {}) =>
  cardSlots({ ...props }).action({ className: cn(classValue, className) });
export const cardContentVariants = ({ class: classValue, className, ...props }: ClassProp = {}) =>
  cardSlots({ ...props }).content({ className: cn(classValue, className) });
export const cardDescriptionVariants = ({
  class: classValue,
  className,
  ...props
}: ClassProp = {}) => cardSlots({ ...props }).description({ className: cn(classValue, className) });
export const cardFooterVariants = ({ class: classValue, className, ...props }: ClassProp = {}) =>
  cardSlots({ ...props }).footer({ className: cn(classValue, className) });
export const cardHeaderVariants = ({ class: classValue, className, ...props }: ClassProp = {}) =>
  cardSlots({ ...props }).header({ className: cn(classValue, className) });
export const cardTitleVariants = ({ class: classValue, className, ...props }: ClassProp = {}) =>
  cardSlots({ ...props }).title({ className: cn(classValue, className) });
