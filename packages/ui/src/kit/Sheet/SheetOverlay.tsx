"use client";

import { Dialog as Primitive } from "@base-ui/react/dialog";

import type { SheetOverlayProps } from "./Sheet.types";
import type { FC } from "react";

import { primitiveClassName } from "../../lib/primitive-classname";
import { sheetSlots } from "./Sheet.styles";

const SheetOverlay: FC<SheetOverlayProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <Primitive.Backdrop
      data-slot="sheet-overlay"
      className={primitiveClassName(sheetSlots({}).overlay(), className)}
      {...rest}
    />
  );
};
export default SheetOverlay;
