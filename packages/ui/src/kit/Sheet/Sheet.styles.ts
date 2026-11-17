import { cn } from "tailwind-variants";

import { tv } from "../../lib/variants";

export const sheetSlots = tv({
  slots: {
    header: cn("flex flex-col gap-theme-2"),
    footer: cn("mt-auto flex flex-col gap-theme-2 sm:flex-row sm:justify-end"),
    overlay: cn("fixed inset-0 z-50 bg-theme-foreground/40"),
    viewport: cn("pointer-events-none fixed inset-0 z-50"),
    popup: cn(
      "pointer-events-auto fixed flex flex-col gap-theme-4 overflow-y-auto bg-theme-background p-theme-6 text-theme-foreground shadow-theme-xl outline-none",
    ),
    title: cn("text-theme-h5 font-theme-semibold"),
    description: cn("text-theme-body1 font-theme-normal text-theme-muted-foreground"),
    close: cn(
      "inline-flex items-center justify-center rounded-theme-sm p-theme-2 theme-motion-colors hover:bg-theme-muted focus-visible:ring-2 focus-visible:ring-theme-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
    ),
  },
  variants: {
    side: {
      right: { popup: "inset-y-0 right-0 w-[min(90vw,28rem)] border-l border-theme-border" },
      left: { popup: "inset-y-0 left-0 w-[min(90vw,28rem)] border-r border-theme-border" },
      top: { popup: "inset-x-0 top-0 max-h-[90dvh] border-b border-theme-border" },
      bottom: { popup: "inset-x-0 bottom-0 max-h-[90dvh] border-t border-theme-border" },
    },
  },
  defaultVariants: { side: "right" },
});
