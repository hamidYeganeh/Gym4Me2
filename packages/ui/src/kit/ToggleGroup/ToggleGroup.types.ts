import { toggleVariants } from "@repo/ui/kit/Toggle";
import type { VariantProps } from "class-variance-authority";
import { ToggleGroup as ToggleGroupPrimitive } from "@animate-ui/react/primitives/radix-ui";
import type * as React from "react";
import type { toggleGroupVariants } from "./ToggleGroup.styles";
export type ToggleGroupProps = React.ComponentProps<
  typeof ToggleGroupPrimitive.Root
> &
  VariantProps<typeof toggleVariants> & {
    spacing?: number;
    orientation?: "horizontal" | "vertical";
  };

export type ToggleGroupItemProps = React.ComponentProps<
  typeof ToggleGroupPrimitive.Item
> &
  VariantProps<typeof toggleVariants>;

export type ToggleGroupVariants = VariantProps<typeof toggleGroupVariants>;
