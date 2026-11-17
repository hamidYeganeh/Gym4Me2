"use client";

import { Accordion as Primitive } from "@animate-ui/react/primitives/base-ui/accordion";

import type { AnimatedAccordionContentProps } from "./AnimatedAccordion.types";
import type { FC } from "react";

import { primitiveClassName } from "../../../lib/primitive-classname";
import { animatedAccordionSlots } from "./AnimatedAccordion.styles";

const AnimatedAccordionContent: FC<AnimatedAccordionContentProps> = (props) => {
  const { className, children, ...rest } = props;
  return (
    <Primitive.Panel
      data-slot="accordion-content"
      className={primitiveClassName(animatedAccordionSlots().content(), className)}
      {...rest}
    >
      <div className={animatedAccordionSlots().body()}>{children}</div>
    </Primitive.Panel>
  );
};

export default AnimatedAccordionContent;
