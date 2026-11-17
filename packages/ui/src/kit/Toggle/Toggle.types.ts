import type { toggleSlots } from "./Toggle.styles";
import type { Toggle as Primitive } from "@base-ui/react/toggle";
import type { VariantProps } from "tailwind-variants";

export type ToggleVariants = VariantProps<typeof toggleSlots>;
export type ToggleProps<Value extends string = string> = Omit<
  Primitive.Props<Value>,
  keyof ToggleVariants
> &
  ToggleVariants;
