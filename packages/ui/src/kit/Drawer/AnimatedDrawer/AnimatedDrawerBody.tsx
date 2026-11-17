"use client";

import { Drawer as Primitive } from "@animate-ui/react/primitives/base-ui/drawer";

import type { AnimatedDrawerBodyProps } from "./AnimatedDrawer.types";
import type { FC } from "react";

import { primitiveClassName } from "../../../lib/primitive-classname";
import { drawerSlots } from "./AnimatedDrawer.styles";

const AnimatedDrawerBody: FC<AnimatedDrawerBodyProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <Primitive.Content
      data-slot="drawer-body"
      className={primitiveClassName(drawerSlots({}).body(), className)}
      {...rest}
    />
  );
};
export default AnimatedDrawerBody;
