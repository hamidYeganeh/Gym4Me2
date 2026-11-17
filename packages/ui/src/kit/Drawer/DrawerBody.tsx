"use client";

import { Drawer as Primitive } from "@base-ui/react/drawer";

import type { DrawerBodyProps } from "./Drawer.types";
import type { FC } from "react";

import { primitiveClassName } from "../../lib/primitive-classname";
import { drawerSlots } from "./Drawer.styles";

const DrawerBody: FC<DrawerBodyProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <Primitive.Content
      data-slot="drawer-body"
      className={primitiveClassName(drawerSlots({}).body(), className)}
      {...rest}
    />
  );
};
export default DrawerBody;
