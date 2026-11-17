"use client";

import { Dialog as Primitive } from "@animate-ui/react/primitives/base-ui/dialog";

import type { AnimatedSheetViewportProps } from "./AnimatedSheet.types";
import type { FC } from "react";

import { primitiveClassName } from "../../../lib/primitive-classname";
import { sheetSlots } from "./AnimatedSheet.styles";

const AnimatedSheetViewport: FC<AnimatedSheetViewportProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <Primitive.Viewport
      data-slot="sheet-viewport"
      className={primitiveClassName(sheetSlots({}).viewport(), className)}
      {...rest}
    />
  );
};
export default AnimatedSheetViewport;
