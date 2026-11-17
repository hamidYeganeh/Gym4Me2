import { cn } from "tailwind-variants";

import { tv } from "../../lib/variants";

export const labelVariants = tv({
  base: cn(
    "inline-flex items-center gap-theme-2 text-theme-body2 font-theme-medium",
    "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
  ),
  variants: {
    color: {
      neutral: "text-theme-foreground",
      primary: "text-theme-primary",
      secondary: "text-theme-secondary-foreground",
      error: "text-theme-error",
      success: "text-theme-success",
      warning: "text-theme-warning-text",
      info: "text-theme-info",
    },
    size: {
      xs: "text-theme-caption",
      sm: "text-theme-body2",
      md: "text-theme-body2",
      lg: "text-theme-body1",
      xl: "text-theme-body-large",
    },
  },
  defaultVariants: { size: "md", color: "neutral" },
});
