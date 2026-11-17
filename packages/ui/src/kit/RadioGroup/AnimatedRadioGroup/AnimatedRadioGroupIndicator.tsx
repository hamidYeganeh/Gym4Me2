"use client";

import { Radio as Primitive } from "@animate-ui/react/primitives/base-ui/radio";

import type { AnimatedRadioGroupIndicatorProps } from "./AnimatedRadioGroup.types";
import type { FC } from "react";

import { primitiveClassName } from "../../../lib/primitive-classname";
import { radioGroupSlots } from "./AnimatedRadioGroup.styles";

const AnimatedRadioGroupIndicator: FC<AnimatedRadioGroupIndicatorProps> = (props) => {
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
export default AnimatedRadioGroupIndicator;
