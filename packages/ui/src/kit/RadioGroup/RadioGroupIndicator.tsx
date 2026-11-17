"use client";

import { Radio as Primitive } from "@base-ui/react/radio";

import type { RadioGroupIndicatorProps } from "./RadioGroup.types";
import type { FC } from "react";

import { primitiveClassName } from "../../lib/primitive-classname";
import { radioGroupSlots } from "./RadioGroup.styles";

const RadioGroupIndicator: FC<RadioGroupIndicatorProps> = (props) => {
  const { className, children, ...rest } = props;
  return (
    <Primitive.Indicator
      data-slot="radio-group-indicator"
      className={primitiveClassName(radioGroupSlots().indicator(), className)}
      {...rest}
    >
      {children ?? <span aria-hidden className="size-1/2 rounded-theme-full bg-current" />}
    </Primitive.Indicator>
  );
};
export default RadioGroupIndicator;
