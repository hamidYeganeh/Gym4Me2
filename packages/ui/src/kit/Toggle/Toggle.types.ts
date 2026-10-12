import type { VariantProps } from "class-variance-authority";
import { Toggle as TogglePrimitive } from "radix-ui";
import type * as React from "react";
import type { toggleVariants } from "./Toggle.styles";
export type ToggleProps = React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>;

export type ToggleVariants = VariantProps<typeof toggleVariants>;
