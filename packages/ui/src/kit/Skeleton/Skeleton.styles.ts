import { tv } from "../../lib/variants";

export const skeletonVariants = tv({
  base: "rounded-theme-md bg-theme-muted motion-safe:animate-pulse",
  variants: {
    radius: {
      none: "rounded-theme-none",
      sm: "rounded-theme-sm",
      md: "rounded-theme-md",
      lg: "rounded-theme-lg",
      full: "rounded-theme-full",
    },
  },
  defaultVariants: { radius: "md" },
});
