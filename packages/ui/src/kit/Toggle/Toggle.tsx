"use client";
import { toggleVariants } from "./Toggle.styles";
import type { ToggleProps } from "./Toggle.types";

import { cn } from "@repo/ui/lib/utils";
import { Toggle as TogglePrimitive } from "radix-ui";

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: ToggleProps) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Toggle };
