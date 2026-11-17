"use client";

import { Accordion as Primitive } from "@base-ui/react/accordion";

import type { AccordionItemProps } from "./Accordion.types";
import type { FC } from "react";

import { primitiveClassName } from "../../lib/primitive-classname";
import { accordionSlots } from "./Accordion.styles";

const AccordionItem: FC<AccordionItemProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <Primitive.Item
      data-slot="accordion-item"
      className={primitiveClassName(accordionSlots().item(), className)}
      {...rest}
    />
  );
};

export default AccordionItem;
