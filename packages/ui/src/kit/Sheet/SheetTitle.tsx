"use client";

import { Dialog as Primitive } from "@base-ui/react/dialog";

import type { SheetTitleProps } from "./Sheet.types";
import type { FC } from "react";

import { primitiveClassName } from "../../lib/primitive-classname";
import { sheetSlots } from "./Sheet.styles";

const SheetTitle: FC<SheetTitleProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <Primitive.Title
      data-slot="sheet-title"
      className={primitiveClassName(sheetSlots({}).title(), className)}
      {...rest}
    />
  );
};
export default SheetTitle;
