"use client";

import { Dialog as Primitive } from "@base-ui/react/dialog";

import type { SheetCloseProps } from "./Sheet.types";
import type { FC } from "react";

import { primitiveClassName } from "../../lib/primitive-classname";
import { sheetSlots } from "./Sheet.styles";

const SheetClose: FC<SheetCloseProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <Primitive.Close
      data-slot="sheet-close"
      className={primitiveClassName(sheetSlots({}).close(), className)}
      {...rest}
    />
  );
};
export default SheetClose;
