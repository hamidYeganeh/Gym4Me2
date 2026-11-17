"use client";

import { RadioGroup as Primitive } from "@base-ui/react/radio-group";

import type { RadioGroupProps } from "./RadioGroup.types";

import { primitiveClassName } from "../../lib/primitive-classname";
import { radioGroupSlots } from "./RadioGroup.styles";

const RadioGroup = <Value,>(props: RadioGroupProps<Value>) => {
  const { className, ...rest } = props;
  return (
    <Primitive
      data-slot="radio-group"
      className={primitiveClassName(radioGroupSlots().root(), className)}
      {...rest}
    />
  );
};
export default RadioGroup;
