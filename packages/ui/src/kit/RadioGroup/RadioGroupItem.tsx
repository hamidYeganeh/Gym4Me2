"use client";

import { Radio as Primitive } from "@base-ui/react/radio";

import type { RadioGroupItemProps } from "./RadioGroup.types";

import { primitiveClassName } from "../../lib/primitive-classname";
import { radioGroupSlots } from "./RadioGroup.styles";
import RadioGroupIndicator from "./RadioGroupIndicator";

const RadioGroupItem = <Value,>(props: RadioGroupItemProps<Value>) => {
  const { className, color, size, children, ...rest } = props;
  return (
    <Primitive.Root
      data-slot="radio-group-item"
      className={primitiveClassName(radioGroupSlots({ color, size }).item(), className)}
      {...rest}
    >
      {children ?? <RadioGroupIndicator />}
    </Primitive.Root>
  );
};
export default RadioGroupItem;
