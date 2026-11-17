import { cn } from "tailwind-variants";

import { tv } from "../../lib/variants";

export const calendarSlots = tv({
  slots: {
    root: cn("w-fit rounded-theme-lg bg-theme-background p-theme-4 text-theme-foreground"),
    months: "relative flex flex-col gap-theme-4 sm:flex-row",
    month: "flex flex-col gap-theme-4",
    month_caption: "flex h-theme-9 items-center justify-center text-theme-body2 font-theme-medium",
    nav: "absolute inset-x-0 top-0 flex justify-between",
    button_previous:
      "size-theme-9 rounded-theme-md hover:bg-theme-muted focus-visible:ring-2 focus-visible:ring-theme-ring disabled:opacity-50",
    button_next:
      "size-theme-9 rounded-theme-md hover:bg-theme-muted focus-visible:ring-2 focus-visible:ring-theme-ring disabled:opacity-50",
    month_grid: "w-full border-collapse",
    weekday: "size-theme-9 text-theme-body2 font-theme-normal text-theme-muted-foreground",
    day: "size-theme-9 p-theme-0 text-center",
    day_button:
      "size-theme-9 rounded-theme-md hover:bg-theme-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring disabled:opacity-50",
    selected: "[&_button]:bg-theme-primary [&_button]:text-theme-primary-foreground",
    today: "font-theme-bold underline underline-offset-4",
    outside: "text-theme-muted-foreground opacity-50",
    disabled: "text-theme-muted-foreground opacity-50",
    hidden: "invisible",
    range_start: "rounded-s-theme-md bg-theme-muted",
    range_end: "rounded-e-theme-md bg-theme-muted",
    range_middle: "rounded-none bg-theme-muted",
  },
});
