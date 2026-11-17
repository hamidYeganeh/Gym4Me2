import { cn } from "tailwind-variants";

import { tv } from "../../lib/variants";

export const tabsSlots = tv({
  slots: {
    root: cn("flex flex-col gap-theme-3 data-[orientation=vertical]:flex-row"),
    list: cn(
      "relative isolate inline-flex w-fit items-center gap-theme-1 rounded-theme-lg bg-theme-muted p-theme-1 text-theme-muted-foreground data-[orientation=vertical]:flex-col",
    ),
    trigger: cn(
      "relative z-10 inline-flex items-center justify-center rounded-theme-md px-theme-4 py-theme-2 text-theme-body2 whitespace-nowrap outline-none theme-motion-colors focus-visible:ring-2 focus-visible:ring-theme-ring data-active:bg-theme-background data-active:text-theme-foreground data-active:shadow-theme-sm data-disabled:pointer-events-none data-disabled:opacity-50",
    ),
    content: cn(
      "min-w-0 flex-1 text-theme-body1 font-theme-normal outline-none focus-visible:ring-2 focus-visible:ring-theme-ring",
    ),
    indicator: cn(
      "absolute start-0 top-0 -z-10 h-(--active-tab-height) w-(--active-tab-width) translate-x-(--active-tab-left) translate-y-(--active-tab-top) rounded-theme-md bg-theme-background shadow-theme-sm",
    ),
  },
});
