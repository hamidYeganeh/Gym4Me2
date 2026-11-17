"use client";

import { Tabs as Primitive } from "@animate-ui/react/primitives/base-ui/tabs";

import type { AnimatedTabsIndicatorProps } from "./AnimatedTabs.types";
import type { FC } from "react";

import { primitiveClassName } from "../../../lib/primitive-classname";
import { tabsSlots } from "./AnimatedTabs.styles";

const AnimatedTabsIndicator: FC<AnimatedTabsIndicatorProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <Primitive.Indicator
      data-slot="tabs-indicator"
      className={primitiveClassName(tabsSlots({}).indicator(), className)}
      {...rest}
    />
  );
};
export default AnimatedTabsIndicator;
