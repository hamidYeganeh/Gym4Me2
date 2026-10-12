import type { VariantProps } from "class-variance-authority";
import { Direction } from "radix-ui";
import type * as React from "react";
import type { directionVariants } from "./Direction.styles";
export type DirectionProviderProps = React.ComponentProps<
  typeof Direction.DirectionProvider
> & {
  direction?: React.ComponentProps<typeof Direction.DirectionProvider>["dir"];
};

export type DirectionVariants = VariantProps<typeof directionVariants>;
