"use client";

import { Accordion as Primitive } from "@base-ui/react/accordion";

import type { AccordionTriggerProps } from "./Accordion.types";
import type { FC } from "react";

import { primitiveClassName } from "../../lib/primitive-classname";
import { accordionSlots } from "./Accordion.styles";

const AccordionTrigger: FC<AccordionTriggerProps> = (props) => {
  const { className, children, ...rest } = props;
  return (
    <Primitive.Header className={accordionSlots().header()}>
      <Primitive.Trigger
        data-slot="accordion-trigger"
        className={primitiveClassName(accordionSlots().trigger(), className)}
        {...rest}
      >
        {children}
        <span aria-hidden="true" className={accordionSlots().indicator()} />
      </Primitive.Trigger>
    </Primitive.Header>
  );
};

export default AccordionTrigger;
