import { cn } from "tailwind-variants";

import { tv } from "../../lib/variants";

export const inputOTPSlots = tv({
  slots: {
    root: cn(
      "flex items-center gap-theme-2 has-[:disabled]:opacity-50 has-[[aria-invalid=true]]:[&_[data-slot=input-otp-slot]]:border-theme-error",
    ),
    group: "flex items-center",
    slot: "relative flex size-10 items-center justify-center border-y border-e border-theme-input bg-theme-background text-theme-foreground first:rounded-s-theme-md first:border-s last:rounded-e-theme-md data-[active=true]:z-10 data-[active=true]:ring-2 data-[active=true]:ring-theme-ring",
    separator: "text-theme-muted-foreground",
    placeholder: "text-theme-muted-foreground",
    caret: "h-4 w-px bg-theme-foreground motion-safe:animate-pulse",
  },
});
