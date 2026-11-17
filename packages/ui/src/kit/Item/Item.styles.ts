import { cn } from "tailwind-variants";

import { tv } from "../../lib/variants";

export const itemSlots = tv({
  slots: {
    root: cn(
      "flex flex-wrap items-center gap-theme-4 rounded-theme-md border border-transparent text-theme-foreground",
    ),
    group: cn("flex flex-col gap-theme-2"),
    separator: cn("w-full border-theme-border"),
    media: cn("flex shrink-0 items-center justify-center [&_img]:size-full [&_img]:object-cover"),
    content: cn("flex min-w-0 flex-1 flex-col gap-theme-1"),
    title: cn("text-theme-body2 font-theme-medium"),
    description: cn("text-theme-body2 text-theme-muted-foreground"),
    actions: cn("flex items-center gap-theme-2"),
    header: cn("flex w-full items-center justify-between gap-theme-2"),
    footer: cn("flex w-full items-center justify-between gap-theme-2"),
  },
  variants: {
    variant: {
      plain: {},
      outlined: { root: "border-theme-border" },
      muted: { root: "bg-theme-muted" },
      icon: { media: "size-10 rounded-theme-md border border-theme-border" },
      image: { media: "size-12 overflow-hidden rounded-theme-md" },
    },
    size: {
      xs: { root: "p-theme-2" },
      sm: { root: "p-theme-3" },
      md: { root: "p-theme-4" },
      lg: { root: "p-theme-6" },
      xl: { root: "p-theme-8" },
    },
  },
  defaultVariants: { variant: "plain", size: "md" },
});
