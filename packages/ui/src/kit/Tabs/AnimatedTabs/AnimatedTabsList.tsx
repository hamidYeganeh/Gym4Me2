"use client";

import { Tabs as Primitive } from "@animate-ui/react/primitives/base-ui/tabs";

import type { AnimatedTabsListProps } from "./AnimatedTabs.types";
import type { FC } from "react";

import { primitiveClassName } from "../../../lib/primitive-classname";
import { tabsSlots } from "./AnimatedTabs.styles";

const AnimatedTabsList: FC<AnimatedTabsListProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <Primitive.List
      data-slot="tabs-list"
      className={primitiveClassName(tabsSlots({}).list(), className)}
      {...rest}
    />
  );
};
export default AnimatedTabsList;
