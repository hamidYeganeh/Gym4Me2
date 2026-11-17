"use client";

import { Select as Primitive } from "@base-ui/react/select";

import type { SelectItemTextProps } from "./Select.types";
import type { FC } from "react";

import { primitiveClassName } from "../../lib/primitive-classname";
import { selectItemTextVariants } from "./Select.styles";

const SelectItemText: FC<SelectItemTextProps> = (props) => {
  const { className, ...rest } = props;

  return (
    <Primitive.ItemText
      data-slot="select-item-text"
      className={primitiveClassName(selectItemTextVariants({}), className)}
      {...rest}
    />
  );
};

export default SelectItemText;
