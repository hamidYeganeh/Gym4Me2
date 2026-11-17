"use client";

import { Dialog as Primitive } from "@base-ui/react/dialog";

import type { SheetPopupProps } from "./Sheet.types";
import type { FC } from "react";

import { primitiveClassName } from "../../lib/primitive-classname";
import { sheetSlots } from "./Sheet.styles";

const SheetPopup: FC<SheetPopupProps> = (props) => {
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
export default SheetPopup;
