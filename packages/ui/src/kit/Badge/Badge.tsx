import { cn } from "@repo/ui/lib/utils";
import { Slot } from "radix-ui";
import { badgeVariants } from "./Badge.styles";
import type { BadgeProps } from "./Badge.types";

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge };
