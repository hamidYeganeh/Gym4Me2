"use client";

import { Select as Primitive } from "@animate-ui/react/primitives/base-ui/select";

import type { AnimatedSelectPopupProps } from "./AnimatedSelect.types";
import type { FC } from "react";

import { primitiveClassName } from "../../../lib/primitive-classname";
import { selectPopupVariants } from "./AnimatedSelect.styles";

const AnimatedSelectPopup: FC<AnimatedSelectPopupProps> = (props) => {
  const { className, radius, shadow, ...rest } = props;

  return (
    <Primitive.Popup
      data-slot="select-popup"
      className={primitiveClassName(selectPopupVariants({ radius, shadow }), className)}
      {...rest}
    />
  );
};

export default AnimatedSelectPopup;
