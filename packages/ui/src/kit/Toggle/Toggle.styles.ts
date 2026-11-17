import { cn } from "tailwind-variants";

import { tv } from "../../lib/variants";

export const toggleSlots = tv({
  slots: {
    root: cn(
      "relative inline-flex shrink-0 items-center justify-center text-theme-body2 font-theme-medium outline-none theme-motion-colors focus-visible:ring-2 focus-visible:ring-theme-ring data-disabled:pointer-events-none data-disabled:opacity-50 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-theme-muted",
    ),
  },
  variants: {
    color: {
      neutral: { root: "data-pressed:bg-theme-foreground/15 data-pressed:text-theme-foreground" },
      primary: { root: "data-pressed:bg-theme-primary/15 data-pressed:text-theme-primary" },
      secondary: { root: "data-pressed:bg-theme-secondary/15 data-pressed:text-theme-secondary" },
      error: { root: "data-pressed:bg-theme-error/15 data-pressed:text-theme-error" },
      success: { root: "data-pressed:bg-theme-success/15 data-pressed:text-theme-success" },
      warning: { root: "data-pressed:bg-theme-warning/15 data-pressed:text-theme-warning" },
      info: { root: "data-pressed:bg-theme-info/15 data-pressed:text-theme-info" },
    },
    size: {
      xs: {
        root: "h-theme-7 px-theme-2 py-theme-1 gap-theme-1 text-theme-caption",
      },
      sm: {
        root: "h-theme-8 px-theme-3 py-theme-1-5 gap-theme-1 text-theme-body2",
      },
      md: {
        root: "h-theme-9 px-theme-4 py-theme-2 gap-theme-2 text-theme-body2",
      },
      lg: {
        root: "h-theme-10 px-theme-5 py-theme-2-5 gap-theme-2 text-theme-body1",
      },
      xl: {
        root: "h-theme-12 px-theme-6 py-theme-3 gap-theme-2 text-theme-body-large",
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
    variant: {
      text: { root: "border border-transparent" },
      outlined: { root: "border border-theme-input" },
    },
  },
  defaultVariants: { color: "primary", size: "md", radius: "md", variant: "text" },
});
