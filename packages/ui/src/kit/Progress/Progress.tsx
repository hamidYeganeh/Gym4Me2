"use client";
import { progressStyles } from "./Progress.styles";
import type { ProgressProps } from "./Progress.types";

import { cn } from "@repo/ui/lib/utils";
import { Progress as ProgressPrimitive } from "radix-ui";

function Progress({ className, value, ...props }: ProgressProps) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(progressStyles.progress(), className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={progressStyles.progress2()}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
