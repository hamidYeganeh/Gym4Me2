"use client";

import { Dialog as Primitive } from "@animate-ui/react/primitives/base-ui/dialog";

import type { AnimatedSheetDescriptionProps } from "./AnimatedSheet.types";
import type { FC } from "react";

import { primitiveClassName } from "../../../lib/primitive-classname";
import { sheetSlots } from "./AnimatedSheet.styles";

const AnimatedSheetDescription: FC<AnimatedSheetDescriptionProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <Primitive.Description
      data-slot="sheet-description"
      className={primitiveClassName(sheetSlots({}).description(), className)}
      {...rest}
    />
  );
};
export default AnimatedSheetDescription;
