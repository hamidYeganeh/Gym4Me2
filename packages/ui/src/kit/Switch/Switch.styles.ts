import { cn } from "tailwind-variants";

import type { ClassProp, VariantProps } from "tailwind-variants";

import { tv } from "../../lib/variants";

export const switchSlots = tv({
  slots: {
    root: cn(
      "inline-flex shrink-0 items-center border border-transparent p-theme-0-5",
      "bg-theme-input theme-motion-colors",
      "outline-none focus-visible:ring-2 focus-visible:ring-theme-ring",
      "data-disabled:pointer-events-none data-disabled:opacity-50",
    ),
    thumb: cn(
      "block aspect-square h-full rounded-theme-full bg-theme-background shadow-theme-xs",
      "data-checked:ms-auto",
    ),
  },
  variants: {
    color: {
      neutral: { root: "data-checked:bg-theme-foreground" },
      primary: { root: "data-checked:bg-theme-primary" },
      secondary: { root: "data-checked:bg-theme-secondary" },
      error: { root: "data-checked:bg-theme-error" },
      success: { root: "data-checked:bg-theme-success" },
      warning: { root: "data-checked:bg-theme-warning" },
      info: { root: "data-checked:bg-theme-info" },
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
      xs: { root: "h-theme-4 w-theme-7" },
      sm: { root: "h-theme-4-5 w-theme-8" },
      md: { root: "h-theme-5 w-theme-9" },
      lg: { root: "h-theme-6 w-theme-11" },
      xl: { root: "h-theme-7 w-theme-13" },
    },
  },
});

// Compatibility helpers retain the existing per-part recipe API.
export const switchVariants = ({
  size = "md",
  color = "primary",
  radius = "full",
  class: classValue,
  className,
  ...props
}: Pick<VariantProps<typeof switchSlots>, "size" | "color" | "radius"> & ClassProp = {}) =>
  switchSlots({ size, color, radius, ...props }).root({ className: cn(classValue, className) });
export const switchThumbVariants = ({ class: classValue, className, ...props }: ClassProp = {}) =>
  switchSlots({ ...props }).thumb({ className: cn(classValue, className) });
