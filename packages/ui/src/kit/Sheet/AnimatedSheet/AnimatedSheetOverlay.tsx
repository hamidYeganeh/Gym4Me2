"use client";

import { Dialog as Primitive } from "@animate-ui/react/primitives/base-ui/dialog";

import type { AnimatedSheetOverlayProps } from "./AnimatedSheet.types";
import type { FC } from "react";

import { primitiveClassName } from "../../../lib/primitive-classname";
import { sheetSlots } from "./AnimatedSheet.styles";

const AnimatedSheetOverlay: FC<AnimatedSheetOverlayProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <Primitive.Backdrop
      data-slot="sheet-overlay"
      className={primitiveClassName(sheetSlots({}).overlay(), className)}
      {...rest}
    />
  );
};
export default AnimatedSheetOverlay;
