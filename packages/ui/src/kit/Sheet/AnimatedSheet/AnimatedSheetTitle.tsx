"use client";

import { Dialog as Primitive } from "@animate-ui/react/primitives/base-ui/dialog";

import type { AnimatedSheetTitleProps } from "./AnimatedSheet.types";
import type { FC } from "react";

import { primitiveClassName } from "../../../lib/primitive-classname";
import { sheetSlots } from "./AnimatedSheet.styles";

const AnimatedSheetTitle: FC<AnimatedSheetTitleProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <Primitive.Title
      data-slot="sheet-title"
      className={primitiveClassName(sheetSlots({}).title(), className)}
      {...rest}
    />
  );
};
export default AnimatedSheetTitle;
