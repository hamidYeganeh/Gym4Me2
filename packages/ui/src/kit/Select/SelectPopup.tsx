"use client";

import { Select as Primitive } from "@base-ui/react/select";

import type { SelectPopupProps } from "./Select.types";
import type { FC } from "react";

import { primitiveClassName } from "../../lib/primitive-classname";
import { selectPopupVariants } from "./Select.styles";

const SelectPopup: FC<SelectPopupProps> = (props) => {
  const { className, radius, shadow, ...rest } = props;

  return (
    <Primitive.Popup
      data-slot="select-popup"
      className={primitiveClassName(selectPopupVariants({ radius, shadow }), className)}
      {...rest}
    />
  );
};

export default SelectPopup;
