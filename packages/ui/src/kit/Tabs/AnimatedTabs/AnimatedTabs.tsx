"use client";

import { Tabs as Primitive } from "@animate-ui/react/primitives/base-ui/tabs";

import type { AnimatedTabsProps } from "./AnimatedTabs.types";
import type { FC } from "react";

import { primitiveClassName } from "../../../lib/primitive-classname";
import { tabsSlots } from "./AnimatedTabs.styles";

const AnimatedTabs: FC<AnimatedTabsProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <Primitive.Root
      data-slot="tabs-root"
      className={primitiveClassName(tabsSlots({}).root(), className)}
      {...rest}
    />
  );
};
export default AnimatedTabs;
