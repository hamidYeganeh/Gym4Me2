"use client";

import { Dialog as Primitive } from "@base-ui/react/dialog";

import type { SheetDescriptionProps } from "./Sheet.types";
import type { FC } from "react";

import { primitiveClassName } from "../../lib/primitive-classname";
import { sheetSlots } from "./Sheet.styles";

const SheetDescription: FC<SheetDescriptionProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <Primitive.Description
      data-slot="sheet-description"
      className={primitiveClassName(sheetSlots({}).description(), className)}
      {...rest}
    />
  );
};
export default SheetDescription;
