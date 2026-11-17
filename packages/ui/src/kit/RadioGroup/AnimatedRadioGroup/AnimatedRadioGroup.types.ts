import type { radioGroupSlots } from "./AnimatedRadioGroup.styles";
import type { Radio as Primitive } from "@animate-ui/react/primitives/base-ui/radio";
import type { RadioGroup as GroupPrimitive } from "@animate-ui/react/primitives/base-ui/radio-group";
import type { ComponentPropsWithRef } from "react";
import type { VariantProps } from "tailwind-variants";

export type AnimatedRadioGroupProps<Value = string> = GroupPrimitive.Props<Value>;
export type AnimatedRadioGroupItemVariants = VariantProps<typeof radioGroupSlots>;
export type AnimatedRadioGroupItemProps<Value = string> = Omit<
  Primitive.Root.Props<Value>,
  keyof AnimatedRadioGroupItemVariants
> &
  AnimatedRadioGroupItemVariants;
export type AnimatedRadioGroupIndicatorProps = ComponentPropsWithRef<typeof Primitive.Indicator>;
