import type { radioGroupSlots } from "./RadioGroup.styles";
import type { Radio as Primitive } from "@base-ui/react/radio";
import type { RadioGroup as GroupPrimitive } from "@base-ui/react/radio-group";
import type { ComponentPropsWithRef } from "react";
import type { VariantProps } from "tailwind-variants";

export type RadioGroupProps<Value = string> = GroupPrimitive.Props<Value>;
export type RadioGroupItemVariants = VariantProps<typeof radioGroupSlots>;
export type RadioGroupItemProps<Value = string> = Omit<
  Primitive.Root.Props<Value>,
  keyof RadioGroupItemVariants
> &
  RadioGroupItemVariants;
export type RadioGroupIndicatorProps = ComponentPropsWithRef<typeof Primitive.Indicator>;
