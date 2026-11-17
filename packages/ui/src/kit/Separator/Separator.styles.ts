import { cn } from "tailwind-variants";

import { tv } from "../../lib/variants";

export const separatorVariants = tv({
  base: cn("shrink-0", "bg-theme-border"),
  variants: {
    orientation: { horizontal: "h-px w-full", vertical: "h-full min-h-theme-4 w-px self-stretch" },
  },
  defaultVariants: { orientation: "horizontal" },
});
