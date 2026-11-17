import type { toggleSlots } from "./AnimatedToggle.styles";
import type { Toggle as Primitive } from "@animate-ui/react/primitives/base-ui/toggle";
import type { VariantProps } from "tailwind-variants";

export type AnimatedToggleVariants = VariantProps<typeof toggleSlots>;
export type AnimatedToggleProps<Value extends string = string> = Omit<
  Primitive.Props<Value>,
  keyof AnimatedToggleVariants
> &
  AnimatedToggleVariants;
