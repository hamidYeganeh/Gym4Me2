"use client";

import { Tabs as Primitive } from "@base-ui/react/tabs";

import type { TabsProps } from "./Tabs.types";
import type { FC } from "react";

import { primitiveClassName } from "../../lib/primitive-classname";
import { tabsSlots } from "./Tabs.styles";

const Tabs: FC<TabsProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <Primitive.Root
      data-slot="tabs-root"
      className={primitiveClassName(tabsSlots({}).root(), className)}
      {...rest}
    />
  );
};
export default Tabs;
