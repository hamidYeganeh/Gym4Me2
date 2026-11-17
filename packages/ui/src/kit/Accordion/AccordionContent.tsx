"use client";

import { Accordion as Primitive } from "@base-ui/react/accordion";

import type { AccordionContentProps } from "./Accordion.types";
import type { FC } from "react";

import { primitiveClassName } from "../../lib/primitive-classname";
import { accordionSlots } from "./Accordion.styles";

const AccordionContent: FC<AccordionContentProps> = (props) => {
  const { className, children, ...rest } = props;
  return (
    <Primitive.Panel
      data-slot="accordion-content"
      className={primitiveClassName(accordionSlots().content(), className)}
      {...rest}
    >
      <div className={accordionSlots().body()}>{children}</div>
    </Primitive.Panel>
  );
};

export default AccordionContent;
