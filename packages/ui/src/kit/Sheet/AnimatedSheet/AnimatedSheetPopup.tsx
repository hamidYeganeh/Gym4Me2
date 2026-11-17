"use client";

import { Dialog as Primitive } from "@animate-ui/react/primitives/base-ui/dialog";

import type { AnimatedSheetPopupProps } from "./AnimatedSheet.types";
import type { FC } from "react";

import { primitiveClassName } from "../../../lib/primitive-classname";
import { sheetSlots } from "./AnimatedSheet.styles";

const AnimatedSheetPopup: FC<AnimatedSheetPopupProps> = (props) => {
  const { className, side = "right", ...rest } = props;
  return (
    <Primitive.Popup
      data-slot="sheet-popup"
      data-side={side}
      className={primitiveClassName(sheetSlots({ side }).popup(), className)}
      {...rest}
    />
  );
};
export default AnimatedSheetPopup;
