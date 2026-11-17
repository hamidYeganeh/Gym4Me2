"use client";

import { Select as Primitive } from "@base-ui/react/select";

import type { SelectItemIndicatorProps } from "./Select.types";
import type { FC } from "react";

import { primitiveClassName } from "../../lib/primitive-classname";
import { selectItemIndicatorVariants } from "./Select.styles";

const SelectItemIndicator: FC<SelectItemIndicatorProps> = (props) => {
  const { className, ...rest } = props;

  return (
    <Primitive.ItemIndicator
      data-slot="select-item-indicator"
      className={primitiveClassName(selectItemIndicatorVariants({}), className)}
      {...rest}
    />
  );
};

export default SelectItemIndicator;
