"use client";

import { Toggle as Primitive } from "@animate-ui/react/primitives/base-ui/toggle";

import type { AnimatedToggleProps } from "./AnimatedToggle.types";

import { primitiveClassName } from "../../../lib/primitive-classname";
import { toggleSlots } from "./AnimatedToggle.styles";

const AnimatedToggle = <Value extends string = string>(props: AnimatedToggleProps<Value>) => {
  const { className, color, size, radius, variant, ...rest } = props;
  return (
    <Primitive
      data-slot="toggle"
      className={primitiveClassName(
        toggleSlots({ color, size, radius, variant }).root(),
        className,
      )}
      {...rest}
    />
  );
};
export default AnimatedToggle;
