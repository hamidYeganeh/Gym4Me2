"use client";

import { Checkbox as Primitive } from "@animate-ui/react/primitives/base-ui/checkbox";

import type { AnimatedCheckboxProps } from "./AnimatedCheckbox.types";
import type { FC } from "react";

import { primitiveClassName } from "../../../lib/primitive-classname";
import { checkboxVariants } from "./AnimatedCheckbox.styles";

const AnimatedCheckbox: FC<AnimatedCheckboxProps> = (props) => {
  const { className, size, color, radius, ...rest } = props;

  return (
    <Primitive.Root
      data-slot="checkbox-root"
      className={primitiveClassName(checkboxVariants({ size, color, radius }), className)}
      {...rest}
    />
  );
};

export default AnimatedCheckbox;
