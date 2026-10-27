import type { VariantProps } from "class-variance-authority";
import { Switch as SwitchPrimitive } from "@animate-ui/react/primitives/radix-ui";
import type * as React from "react";
import type { switchVariants } from "./Switch.styles";
export type SwitchProps = React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default";
};

export type SwitchVariants = VariantProps<typeof switchVariants>;
