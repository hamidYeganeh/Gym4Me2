import { cn } from "tailwind-variants";

import { tv } from "../../lib/variants";

export const inputVariants = tv({
  base: cn(
    cn(
      "flex w-full min-w-theme-0 px-theme-4 py-theme-2",
      "text-theme-body1 font-theme-normal outline-none theme-motion-colors",
      "placeholder:text-theme-muted-foreground focus-visible:ring-2",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "aria-invalid:border-theme-error aria-invalid:ring-theme-error",
    ),
    "file:border-0 file:bg-transparent file:font-theme-medium",
  ),
  variants: {
    variant: {
      outlined: "border border-theme-input bg-theme-background",
      filled: "border border-transparent bg-theme-muted",
    },
    color: {
      neutral: "focus-visible:ring-theme-foreground",
      primary: "focus-visible:ring-theme-primary",
      secondary: "focus-visible:ring-theme-secondary",
      error: "focus-visible:ring-theme-error",
      success: "focus-visible:ring-theme-success",
      warning: "focus-visible:ring-theme-warning",
      info: "focus-visible:ring-theme-info",
    },
    radius: {
      none: "rounded-theme-none",
      xs: "rounded-theme-xs",
      sm: "rounded-theme-sm",
      md: "rounded-theme-md",
      lg: "rounded-theme-lg",
      xl: "rounded-theme-xl",
      "2xl": "rounded-theme-2xl",
      "3xl": "rounded-theme-3xl",
      full: "rounded-theme-full",
    },
    size: {
      xs: "h-theme-7 px-theme-2 py-theme-1 gap-theme-1 text-theme-caption",
      sm: "h-theme-8 px-theme-3 py-theme-1-5 gap-theme-1 text-theme-body2",
      md: "h-theme-9 px-theme-4 py-theme-2 gap-theme-2 text-theme-body2",
      lg: "h-theme-10 px-theme-5 py-theme-2-5 gap-theme-2 text-theme-body1",
      xl: "h-theme-12 px-theme-6 py-theme-3 gap-theme-2 text-theme-body-large",
    },
    shadow: {
      none: "shadow-theme-none",
      xs: "shadow-theme-xs",
      sm: "shadow-theme-sm",
      md: "shadow-theme-md",
      lg: "shadow-theme-lg",
      xl: "shadow-theme-xl",
    },
  },
  defaultVariants: {
    variant: "outlined",
    color: "primary",
    size: "md",
    radius: "md",
  },
});
