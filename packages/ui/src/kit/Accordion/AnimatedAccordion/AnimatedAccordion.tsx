"use client";

import { Accordion as Primitive } from "@animate-ui/react/primitives/base-ui/accordion";

import type { AnimatedAccordionProps } from "./AnimatedAccordion.types";

import { primitiveClassName } from "../../../lib/primitive-classname";
import { animatedAccordionSlots } from "./AnimatedAccordion.styles";

const AnimatedAccordion = <Value,>(props: AnimatedAccordionProps<Value>) => {
  const { className, ...rest } = props;
  return (
    <Primitive.Root
      data-slot="accordion"
      className={primitiveClassName(animatedAccordionSlots().root(), className)}
      {...rest}
    />
  );
};

export default AnimatedAccordion;
