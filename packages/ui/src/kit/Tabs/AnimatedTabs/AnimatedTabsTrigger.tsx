"use client";

import { Tabs as Primitive } from "@animate-ui/react/primitives/base-ui/tabs";

import type { AnimatedTabsTriggerProps } from "./AnimatedTabs.types";
import type { FC } from "react";

import { primitiveClassName } from "../../../lib/primitive-classname";
import { tabsSlots } from "./AnimatedTabs.styles";

const AnimatedTabsTrigger: FC<AnimatedTabsTriggerProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <Primitive.Tab
      data-slot="tabs-trigger"
      className={primitiveClassName(tabsSlots({}).trigger(), className)}
      {...rest}
    />
  );
};
export default AnimatedTabsTrigger;
