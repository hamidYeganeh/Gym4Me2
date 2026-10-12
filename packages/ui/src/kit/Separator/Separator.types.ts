import type { VariantProps } from "class-variance-authority";
import { Separator as SeparatorPrimitive } from "radix-ui";
import type * as React from "react";
import type { separatorVariants } from "./Separator.styles";
export type SeparatorProps = React.ComponentProps<
  typeof SeparatorPrimitive.Root
>;

export type SeparatorVariants = VariantProps<typeof separatorVariants>;
