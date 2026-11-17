import { cn } from "tailwind-variants";

import { tv } from "../../lib/variants";

export const inputGroupSlots = tv({
  slots: {
    root: cn(
      "group/input-group flex w-full flex-wrap items-center rounded-theme-md border border-theme-input bg-theme-background has-[:disabled]:opacity-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-theme-ring has-[[aria-invalid=true]]:border-theme-error",
    ),
    text: cn("flex items-center gap-theme-2 text-theme-body2 text-theme-muted-foreground"),
    addon: cn(
      "flex items-center gap-theme-2 px-theme-4 text-theme-body2 text-theme-muted-foreground",
    ),
    input: cn(
      "min-w-0 flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0",
    ),
    textarea: cn(
      "min-w-0 flex-1 resize-y rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0",
    ),
  },
});
