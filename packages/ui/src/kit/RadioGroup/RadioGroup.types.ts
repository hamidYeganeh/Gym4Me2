import type { VariantProps } from "class-variance-authority";
import { RadioGroup as RadioGroupPrimitive } from "@animate-ui/react/primitives/radix-ui";
import type * as React from "react";
import type { radioGroupVariants } from "./RadioGroup.styles";
export type RadioGroupProps = React.ComponentProps<
  typeof RadioGroupPrimitive.Root
>;

export type RadioGroupItemProps = React.ComponentProps<
  typeof RadioGroupPrimitive.Item
>;

export type RadioGroupVariants = VariantProps<typeof radioGroupVariants>;
