import { cn } from "@repo/ui/lib/utils";
import { Slot } from "radix-ui";
import { markerStyles, markerVariants } from "./Marker.styles";
import type {
  MarkerContentProps,
  MarkerIconProps,
  MarkerProps,
} from "./Marker.types";

function Marker({
  className,
  variant = "default",
  asChild = false,
  ...props
}: MarkerProps) {
  const Comp = asChild ? Slot.Root : "div";

  return (
    <Comp
      data-slot="marker"
      data-variant={variant}
      className={cn(markerVariants({ variant, className }))}
      {...props}
    />
  );
}

function MarkerIcon({ className, ...props }: MarkerIconProps) {
  return (
    <span
      data-slot="marker-icon"
      aria-hidden="true"
      className={cn(markerStyles.markerIcon(), className)}
      {...props}
    />
  );
}

function MarkerContent({ className, ...props }: MarkerContentProps) {
  return (
    <span
      data-slot="marker-content"
      className={cn(markerStyles.markerContent(), className)}
      {...props}
    />
  );
}

export { Marker, MarkerContent, MarkerIcon };
