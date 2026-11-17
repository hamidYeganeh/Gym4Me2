import { cn } from "tailwind-variants";

import { tv } from "../../lib/variants";

export const emptySlots = tv({
  slots: {
    root: cn(
      "flex flex-col items-center justify-center gap-theme-6 rounded-theme-lg border border-dashed border-theme-border p-theme-6 text-center",
    ),
    header: cn("flex max-w-sm flex-col items-center gap-theme-2"),
    media: cn("flex items-center justify-center text-theme-muted-foreground"),
    title: cn("text-theme-h5 font-theme-semibold"),
    description: cn("text-theme-body2 text-theme-muted-foreground"),
    content: cn("flex w-full max-w-sm flex-col items-center gap-theme-4"),
  },
  variants: {
    variant: {
      icon: { media: "size-12 rounded-theme-lg bg-theme-muted" },
      plain: { media: "bg-transparent" },
    },
  },
  defaultVariants: { variant: "plain" },
});
