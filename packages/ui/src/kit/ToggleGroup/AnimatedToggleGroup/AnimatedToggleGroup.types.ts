import type { ToggleGroup as Primitive } from "@animate-ui/react/primitives/base-ui/toggle-group";
import type { RefAttributes } from "react";

export type AnimatedToggleGroupProps<Value extends string = string> = Primitive.Props<Value> &
  RefAttributes<HTMLDivElement>;
export type { AnimatedToggleProps as AnimatedToggleGroupItemProps } from "../../Toggle/AnimatedToggle/AnimatedToggle.types";
