"use client";

import { Dialog as Primitive } from "@animate-ui/react/primitives/base-ui/dialog";

import type { AnimatedSheetCloseProps } from "./AnimatedSheet.types";
import type { FC } from "react";

import { primitiveClassName } from "../../../lib/primitive-classname";
import { sheetSlots } from "./AnimatedSheet.styles";

const AnimatedSheetClose: FC<AnimatedSheetCloseProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <Primitive.Close
      data-slot="sheet-close"
      className={primitiveClassName(sheetSlots({}).close(), className)}
      {...rest}
    />
  );
};
export default AnimatedSheetClose;
