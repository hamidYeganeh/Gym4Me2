"use client";

import { ToggleGroup as Primitive } from "@base-ui/react/toggle-group";

import type { ToggleGroupProps } from "./ToggleGroup.types";

import { primitiveClassName } from "../../lib/primitive-classname";
import { toggleGroupSlots } from "./ToggleGroup.styles";

const ToggleGroup = <Value extends string = string>(props: ToggleGroupProps<Value>) => {
  const { className, ...rest } = props;
  return (
    <Primitive
      data-slot="toggle-group"
      className={primitiveClassName(toggleGroupSlots().root(), className)}
      {...rest}
    />
  );
};
export default ToggleGroup;
