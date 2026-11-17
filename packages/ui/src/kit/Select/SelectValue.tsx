"use client";

import { Select as Primitive } from "@base-ui/react/select";

import type { SelectValueProps } from "./Select.types";
import type { FC } from "react";

import { primitiveClassName } from "../../lib/primitive-classname";
import { selectValueVariants } from "./Select.styles";

const SelectValue: FC<SelectValueProps> = (props) => {
  const { className, ...rest } = props;

  return (
    <Primitive.Value
      data-slot="select-value"
      className={primitiveClassName(selectValueVariants({}), className)}
      {...rest}
    />
  );
};

export default SelectValue;
