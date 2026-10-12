import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import type { markerVariants } from "./Marker.styles";
export type MarkerProps = React.ComponentProps<"div"> &
  VariantProps<typeof markerVariants> & {
    asChild?: boolean;
  };

export type MarkerIconProps = React.ComponentProps<"span">;

export type MarkerContentProps = React.ComponentProps<"span">;

export type MarkerVariants = VariantProps<typeof markerVariants>;
