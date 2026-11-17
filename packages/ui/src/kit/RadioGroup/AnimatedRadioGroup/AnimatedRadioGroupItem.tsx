"use client";

import { Radio as Primitive } from "@animate-ui/react/primitives/base-ui/radio";

import type { AnimatedRadioGroupItemProps } from "./AnimatedRadioGroup.types";

import { primitiveClassName } from "../../../lib/primitive-classname";
import { radioGroupSlots } from "./AnimatedRadioGroup.styles";
import AnimatedRadioGroupIndicator from "./AnimatedRadioGroupIndicator";

const AnimatedRadioGroupItem = <Value,>(props: AnimatedRadioGroupItemProps<Value>) => {
  const { className, color, size, children, ...rest } = props;
  return (
    <Primitive.Root
      data-slot="radio-group-item"
      className={primitiveClassName(radioGroupSlots({ color, size }).item(), className)}
      {...rest}
    >
      {children ?? <AnimatedRadioGroupIndicator />}
    </Primitive.Root>
  );
};
export default AnimatedRadioGroupItem;
