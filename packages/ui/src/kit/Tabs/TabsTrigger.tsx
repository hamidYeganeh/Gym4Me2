"use client";

import { Tabs as Primitive } from "@base-ui/react/tabs";

import type { TabsTriggerProps } from "./Tabs.types";
import type { FC } from "react";

import { primitiveClassName } from "../../lib/primitive-classname";
import { tabsSlots } from "./Tabs.styles";

const TabsTrigger: FC<TabsTriggerProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <Primitive.Tab
      data-slot="tabs-trigger"
      className={primitiveClassName(tabsSlots({}).trigger(), className)}
      {...rest}
    />
  );
};
export default TabsTrigger;
