import { cn } from "tailwind-variants";

import { tv } from "../../lib/variants";

export const toggleGroupSlots = tv({
  slots: {
    root: cn("inline-flex w-fit items-center gap-theme-1 data-[orientation=vertical]:flex-col"),
  },
});
