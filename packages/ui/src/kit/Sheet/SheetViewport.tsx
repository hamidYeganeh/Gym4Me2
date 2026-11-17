"use client";

import { Dialog as Primitive } from "@base-ui/react/dialog";

import type { SheetViewportProps } from "./Sheet.types";
import type { FC } from "react";

import { primitiveClassName } from "../../lib/primitive-classname";
import { sheetSlots } from "./Sheet.styles";

const SheetViewport: FC<SheetViewportProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <Primitive.Viewport
      data-slot="sheet-viewport"
      className={primitiveClassName(sheetSlots({}).viewport(), className)}
      {...rest}
    />
  );
};
export default SheetViewport;
