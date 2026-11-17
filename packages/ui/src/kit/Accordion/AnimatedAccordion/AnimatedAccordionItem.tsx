"use client";

import { Accordion as Primitive } from "@animate-ui/react/primitives/base-ui/accordion";

import type { AnimatedAccordionItemProps } from "./AnimatedAccordion.types";
import type { FC } from "react";

import { primitiveClassName } from "../../../lib/primitive-classname";
import { animatedAccordionSlots } from "./AnimatedAccordion.styles";

const AnimatedAccordionItem: FC<AnimatedAccordionItemProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <Primitive.Item
      data-slot="accordion-item"
      className={primitiveClassName(animatedAccordionSlots().item(), className)}
      {...rest}
    />
  );
};

export default AnimatedAccordionItem;
