import type { ToggleGroup as Primitive } from "@base-ui/react/toggle-group";
import type { RefAttributes } from "react";

export type ToggleGroupProps<Value extends string = string> = Primitive.Props<Value> &
  RefAttributes<HTMLDivElement>;
export type { ToggleProps as ToggleGroupItemProps } from "../Toggle/Toggle.types";
