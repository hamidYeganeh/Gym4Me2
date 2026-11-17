"use client";

import { Toggle as Primitive } from "@base-ui/react/toggle";

import type { ToggleProps } from "./Toggle.types";

import { primitiveClassName } from "../../lib/primitive-classname";
import { toggleSlots } from "./Toggle.styles";

const Toggle = <Value extends string = string>(props: ToggleProps<Value>) => {
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
export default Toggle;
