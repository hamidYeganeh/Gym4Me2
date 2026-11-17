import { cn } from "tailwind-variants";

import { tv } from "../../lib/variants";

export const radioGroupSlots = tv({
  slots: {
    root: cn("grid gap-theme-3"),
    item: cn(
      "inline-flex shrink-0 items-center justify-center rounded-theme-full border border-theme-input bg-theme-background outline-none theme-motion-colors focus-visible:ring-2 focus-visible:ring-theme-ring data-disabled:pointer-events-none data-disabled:opacity-50",
    ),
    indicator: cn("inline-flex size-full items-center justify-center"),
  },
  variants: {
    color: {
      neutral: { item: "data-checked:border-theme-foreground data-checked:text-theme-foreground" },
      primary: { item: "data-checked:border-theme-primary data-checked:text-theme-primary" },
      secondary: { item: "data-checked:border-theme-secondary data-checked:text-theme-secondary" },
      error: { item: "data-checked:border-theme-error data-checked:text-theme-error" },
      success: { item: "data-checked:border-theme-success data-checked:text-theme-success" },
      warning: { item: "data-checked:border-theme-warning data-checked:text-theme-warning" },
      info: { item: "data-checked:border-theme-info data-checked:text-theme-info" },
    },
    size: {
      xs: { item: "size-theme-3" },
      sm: { item: "size-theme-3-5" },
      md: { item: "size-theme-4" },
      lg: { item: "size-theme-5" },
      xl: { item: "size-theme-6" },
    },
  },
  defaultVariants: { color: "primary", size: "md" },
});
