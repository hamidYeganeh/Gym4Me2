"use client";

import { Checkbox as Primitive } from "@animate-ui/react/primitives/base-ui/checkbox";

import type { AnimatedCheckboxIndicatorProps } from "./AnimatedCheckbox.types";
import type { FC } from "react";

import { primitiveClassName } from "../../../lib/primitive-classname";
import { checkboxIndicatorVariants } from "./AnimatedCheckbox.styles";

const AnimatedCheckboxIndicator: FC<AnimatedCheckboxIndicatorProps> = (props) => {
  const { className, ...rest } = props;

  return (
    <Primitive.Indicator
      data-slot="checkbox-indicator"
      className={primitiveClassName(checkboxIndicatorVariants({}), className)}
      {...rest}
    />
  );
};

export default AnimatedCheckboxIndicator;
