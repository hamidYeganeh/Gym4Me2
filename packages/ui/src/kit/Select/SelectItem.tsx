"use client";

import { Select as Primitive } from "@base-ui/react/select";

import type { SelectItemProps } from "./Select.types";
import type { FC } from "react";

import { primitiveClassName } from "../../lib/primitive-classname";
import { selectItemVariants } from "./Select.styles";

const SelectItem: FC<SelectItemProps> = (props) => {
  const { className, size, radius, ...rest } = props;

  return (
    <Primitive.Item
      data-slot="select-item"
      className={primitiveClassName(selectItemVariants({ size, radius }), className)}
      {...rest}
    />
  );
};

export default SelectItem;
