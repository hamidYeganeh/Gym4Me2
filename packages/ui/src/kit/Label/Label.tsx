"use client";
import { labelStyles } from "./Label.styles";
import type { LabelProps } from "./Label.types";

import { cn } from "@repo/ui/lib/utils";
import { Label as LabelPrimitive } from "radix-ui";

function Label({ className, ...props }: LabelProps) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(labelStyles.label(), className)}
      {...props}
    />
  );
}

export { Label };
