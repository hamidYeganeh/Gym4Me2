"use client";

import { ToggleGroup as Primitive } from "@animate-ui/react/primitives/base-ui/toggle-group";

import type { AnimatedToggleGroupProps } from "./AnimatedToggleGroup.types";

import { primitiveClassName } from "../../../lib/primitive-classname";
import { toggleGroupSlots } from "./AnimatedToggleGroup.styles";

const AnimatedToggleGroup = <Value extends string = string>(
  props: AnimatedToggleGroupProps<Value>,
) => {
  const { className, ...rest } = props;
  return (
    <Primitive
      data-slot="toggle-group"
      className={primitiveClassName(toggleGroupSlots().root(), className)}
      {...rest}
    />
  );
};
export default AnimatedToggleGroup;
