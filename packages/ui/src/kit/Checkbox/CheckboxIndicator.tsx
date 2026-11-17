"use client";

import { Checkbox as Primitive } from "@base-ui/react/checkbox";

import type { CheckboxIndicatorProps } from "./Checkbox.types";
import type { FC } from "react";

import { primitiveClassName } from "../../lib/primitive-classname";
import { checkboxIndicatorVariants } from "./Checkbox.styles";

const CheckboxIndicator: FC<CheckboxIndicatorProps> = (props) => {
  const { className, ...rest } = props;

  return (
    <Primitive.Indicator
      data-slot="checkbox-indicator"
      className={primitiveClassName(checkboxIndicatorVariants({}), className)}
      {...rest}
    />
  );
};

export default CheckboxIndicator;
