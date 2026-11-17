"use client";

import { Accordion as Primitive } from "@base-ui/react/accordion";

import type { AccordionProps } from "./Accordion.types";

import { primitiveClassName } from "../../lib/primitive-classname";
import { accordionSlots } from "./Accordion.styles";

const Accordion = <Value,>(props: AccordionProps<Value>) => {
  const { className, ...rest } = props;
  return (
    <Primitive.Root
      data-slot="accordion"
      className={primitiveClassName(accordionSlots().root(), className)}
      {...rest}
    />
  );
};

export default Accordion;
