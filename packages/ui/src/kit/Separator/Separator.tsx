"use client";
import { separatorStyles } from "./Separator.styles";
import type { SeparatorProps } from "./Separator.types";

import { cn } from "@repo/ui/lib/utils";
import { Separator as SeparatorPrimitive } from "radix-ui";

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: SeparatorProps) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(separatorStyles.separator(), className)}
      {...props}
    />
  );
}

export { Separator };
