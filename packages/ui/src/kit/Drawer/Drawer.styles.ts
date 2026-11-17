import { cn } from "tailwind-variants";

import { tv } from "../../lib/variants";

export const drawerSlots = tv({
  slots: {
    handle: cn(
      "mx-auto h-theme-1 w-theme-12 shrink-0 rounded-theme-full bg-theme-muted-foreground/40",
    ),
    header: cn("flex flex-col gap-theme-2"),
    footer: cn("mt-auto flex flex-col gap-theme-2 sm:flex-row sm:justify-end"),
    overlay: cn("fixed inset-0 z-50 bg-theme-foreground/40"),
    viewport: cn("pointer-events-none fixed inset-0 z-50"),
    popup: cn(
      "pointer-events-auto fixed flex max-h-[90dvh] flex-col gap-theme-4 overflow-y-auto border border-theme-border bg-theme-background p-theme-6 text-theme-foreground shadow-theme-xl outline-none data-[swipe-direction=down]:inset-x-0 data-[swipe-direction=down]:bottom-0 data-[swipe-direction=down]:rounded-t-theme-xl data-[swipe-direction=left]:inset-y-0 data-[swipe-direction=left]:left-0 data-[swipe-direction=left]:max-h-none data-[swipe-direction=left]:w-[min(90vw,28rem)] data-[swipe-direction=right]:inset-y-0 data-[swipe-direction=right]:right-0 data-[swipe-direction=right]:max-h-none data-[swipe-direction=right]:w-[min(90vw,28rem)] data-[swipe-direction=up]:inset-x-0 data-[swipe-direction=up]:top-0 data-[swipe-direction=up]:rounded-b-theme-xl",
    ),
    title: cn("text-theme-h5 font-theme-semibold"),
    description: cn("text-theme-body1 font-theme-normal text-theme-muted-foreground"),
    close: cn(
      "inline-flex items-center justify-center rounded-theme-sm p-theme-2 theme-motion-colors hover:bg-theme-muted focus-visible:ring-2 focus-visible:ring-theme-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
    ),
    body: cn(
      "min-h-0 flex-1 overflow-y-auto overscroll-contain text-theme-body1 font-theme-normal",
    ),
  },
});
