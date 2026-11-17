"use client";

import { Tabs as Primitive } from "@animate-ui/react/primitives/base-ui/tabs";

import type { AnimatedTabsContentProps } from "./AnimatedTabs.types";
import type { FC } from "react";

import { primitiveClassName } from "../../../lib/primitive-classname";
import { tabsSlots } from "./AnimatedTabs.styles";

const AnimatedTabsContent: FC<AnimatedTabsContentProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <Primitive.Panel
      data-slot="tabs-content"
      className={primitiveClassName(tabsSlots({}).content(), className)}
      {...rest}
    />
  );
};
export default AnimatedTabsContent;
