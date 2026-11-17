import { tv } from "../../lib/variants";

export const accordionSlots = tv({
  slots: {
    root: "w-full overflow-hidden rounded-theme-2xl border border-theme-border",
    item: "border-b border-theme-border bg-theme-secondary last:border-b-0 data-open:bg-theme-background",
    header: "flex",
    trigger:
      "group flex min-h-24 w-full cursor-pointer items-center justify-between gap-theme-4 px-theme-6 py-theme-5 text-start font-theme-bold outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theme-ring data-disabled:cursor-default data-disabled:opacity-50",
    indicator:
      "relative grid size-9 shrink-0 place-items-center rounded-full bg-theme-muted before:h-0.5 before:w-3.5 before:rounded-full before:bg-current after:absolute after:h-3.5 after:w-0.5 after:rounded-full after:bg-current motion-safe:after:transition-transform group-aria-expanded:after:scale-y-0",
    content: "overflow-hidden text-theme-body1 leading-loose text-theme-muted-foreground",
    body: "px-theme-6 pb-theme-10 pt-theme-3",
  },
});
