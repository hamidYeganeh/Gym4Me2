import { cn } from "tailwind-variants";

import type { ClassProp, VariantProps } from "tailwind-variants";

import { tv } from "../../lib/variants";

export const checkboxSlots = tv({
  slots: {
    root: cn(
      "inline-flex shrink-0 items-center justify-center border border-theme-input bg-theme-background",
      "outline-none theme-motion-colors focus-visible:ring-2 focus-visible:ring-theme-ring",
      "data-disabled:pointer-events-none data-disabled:opacity-50",
    ),
    indicator: cn("inline-flex size-full items-center justify-center"),
  },
  variants: {
    color: {
      neutral: {
        root: "data-checked:border-theme-foreground data-checked:bg-theme-foreground data-checked:text-theme-background data-indeterminate:border-theme-foreground data-indeterminate:bg-theme-foreground data-indeterminate:text-theme-background",
      },
      primary: {
        root: "data-checked:border-theme-primary data-checked:bg-theme-primary data-checked:text-theme-primary-foreground data-indeterminate:border-theme-primary data-indeterminate:bg-theme-primary data-indeterminate:text-theme-primary-foreground",
      },
      secondary: {
        root: "data-checked:border-theme-secondary data-checked:bg-theme-secondary data-checked:text-theme-secondary-foreground data-indeterminate:border-theme-secondary data-indeterminate:bg-theme-secondary data-indeterminate:text-theme-secondary-foreground",
      },
      error: {
        root: "data-checked:border-theme-error data-checked:bg-theme-error data-checked:text-theme-error-foreground data-indeterminate:border-theme-error data-indeterminate:bg-theme-error data-indeterminate:text-theme-error-foreground",
      },
      success: {
        root: "data-checked:border-theme-success data-checked:bg-theme-success data-checked:text-theme-success-foreground data-indeterminate:border-theme-success data-indeterminate:bg-theme-success data-indeterminate:text-theme-success-foreground",
      },
      warning: {
        root: "data-checked:border-theme-warning data-checked:bg-theme-warning data-checked:text-theme-warning-foreground data-indeterminate:border-theme-warning data-indeterminate:bg-theme-warning data-indeterminate:text-theme-warning-foreground",
      },
      info: {
        root: "data-checked:border-theme-info data-checked:bg-theme-info data-checked:text-theme-info-foreground data-indeterminate:border-theme-info data-indeterminate:bg-theme-info data-indeterminate:text-theme-info-foreground",
      },
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
      xs: { root: "size-theme-3 text-theme-caption" },
      sm: { root: "size-theme-3-5 text-theme-body2" },
      md: { root: "size-theme-4 text-theme-body2" },
      lg: { root: "size-theme-5 text-theme-body1" },
      xl: { root: "size-theme-6 text-theme-body-large" },
    },
  },
});

// Compatibility helpers retain the existing per-part recipe API.
export const checkboxVariants = ({
  size = "md",
  color = "primary",
  radius = "sm",
  class: classValue,
  className,
  ...props
}: Pick<VariantProps<typeof checkboxSlots>, "size" | "color" | "radius"> & ClassProp = {}) =>
  checkboxSlots({ size, color, radius, ...props }).root({ className: cn(classValue, className) });
export const checkboxIndicatorVariants = ({
  class: classValue,
  className,
  ...props
}: ClassProp = {}) =>
  checkboxSlots({ ...props }).indicator({ className: cn(classValue, className) });
