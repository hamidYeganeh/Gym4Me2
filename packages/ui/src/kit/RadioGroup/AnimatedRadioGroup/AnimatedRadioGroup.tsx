"use client";

import { RadioGroup as Primitive } from "@animate-ui/react/primitives/base-ui/radio-group";

import type { AnimatedRadioGroupProps } from "./AnimatedRadioGroup.types";

import { primitiveClassName } from "../../../lib/primitive-classname";
import { radioGroupSlots } from "./AnimatedRadioGroup.styles";

const AnimatedRadioGroup = <Value,>(props: AnimatedRadioGroupProps<Value>) => {
  const { className, ...rest } = props;
  return (
    <Primitive
      data-slot="radio-group"
      className={primitiveClassName(radioGroupSlots().root(), className)}
      {...rest}
    />
  );
};
export default AnimatedRadioGroup;
