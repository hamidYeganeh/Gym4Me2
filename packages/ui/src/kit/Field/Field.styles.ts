import { tv } from "../../lib/variants";

export const fieldSlots = tv({
  slots: {
    field: "flex min-w-0 flex-col gap-theme-2",
    group: "flex flex-col gap-theme-5",
    label: "text-theme-body2 font-theme-medium",
    description: "text-theme-caption text-theme-muted-foreground",
    set: "flex min-w-0 flex-col gap-theme-4",
    legend: "mb-theme-3 text-theme-body1 font-theme-semibold",
  },
});
