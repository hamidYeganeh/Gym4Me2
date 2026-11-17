"use client";

import { Checkbox as Primitive } from "@base-ui/react/checkbox";

import type { CheckboxProps } from "./Checkbox.types";
import type { FC } from "react";

import { primitiveClassName } from "../../lib/primitive-classname";
import { checkboxVariants } from "./Checkbox.styles";

const Checkbox: FC<CheckboxProps> = (props) => {
  const { className, size, color, radius, ...rest } = props;

  return (
    <Primitive.Root
      data-slot="checkbox-root"
      className={primitiveClassName(checkboxVariants({ size, color, radius }), className)}
      {...rest}
    />
  );
};

export default Checkbox;
