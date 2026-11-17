"use client";

import { Select as Primitive } from "@base-ui/react/select";

import type { SelectTriggerProps } from "./Select.types";
import type { FC } from "react";

import { primitiveClassName } from "../../lib/primitive-classname";
import { selectTriggerVariants } from "./Select.styles";

const SelectTrigger: FC<SelectTriggerProps> = (props) => {
  const { className, size, color, radius, shadow, ...rest } = props;

  return (
    <Primitive.Trigger
      data-slot="select-trigger"
      className={primitiveClassName(
        selectTriggerVariants({ size, color, radius, shadow }),
        className,
      )}
      {...rest}
    />
  );
};

export default SelectTrigger;
