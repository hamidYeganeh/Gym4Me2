import { cn } from "@repo/ui/lib/utils";
import { skeletonStyles } from "./Skeleton.styles";
import type { SkeletonProps } from "./Skeleton.types";

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      className={cn(skeletonStyles.skeleton(), className)}
      {...props}
    />
  );
}

export { Skeleton };
