"use client";

import { Tabs as Primitive } from "@base-ui/react/tabs";

import type { TabsListProps } from "./Tabs.types";
import type { FC } from "react";

import { primitiveClassName } from "../../lib/primitive-classname";
import { tabsSlots } from "./Tabs.styles";

const TabsList: FC<TabsListProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <Primitive.List
      data-slot="tabs-list"
      className={primitiveClassName(tabsSlots({}).list(), className)}
      {...rest}
    />
  );
};
export default TabsList;
