"use client";

import { Slot } from "@radix-ui/react-slot";

import type { ItemProps } from "./Item.types";
import type { FC } from "react";

import { itemSlots } from "./Item.styles";

const Item: FC<ItemProps> = (props) => {
  const { className, variant, size, asChild, ...rest } = props;
  const Component = asChild ? Slot : "div";
  return (
    <Component
      data-slot="item"
      className={itemSlots({ variant, size }).root({ className })}
      {...rest}
    />
  );
};
export default Item;
