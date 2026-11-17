import { tv } from "../../lib/variants";

export const tableSlots = tv({
  slots: {
    container:
      "w-full overflow-x-auto rounded-theme-card border border-theme-border bg-theme-background shadow-theme-md",
    root: "w-full border-collapse text-theme-body-md",
    header: "bg-theme-primary text-theme-primary-foreground",
    body: "[&>tr:nth-child(even)]:bg-theme-surface-soft",
    footer: "border-t border-theme-border bg-theme-background",
    row: "border-b border-theme-border last:border-b-0",
    head: "px-theme-4 py-theme-5 text-center text-theme-body-large font-theme-bold first:px-theme-6 first:text-start",
    cell: "px-theme-4 py-theme-4 align-middle first:px-theme-6",
    caption: "caption-bottom p-theme-4 text-theme-muted-foreground",
  },
});
