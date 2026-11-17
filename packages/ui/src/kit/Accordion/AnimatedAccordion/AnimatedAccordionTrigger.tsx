"use client";

import { Accordion as Primitive } from "@animate-ui/react/primitives/base-ui/accordion";

import type { AnimatedAccordionTriggerProps } from "./AnimatedAccordion.types";
import type { FC } from "react";

import { primitiveClassName } from "../../../lib/primitive-classname";
import { animatedAccordionSlots } from "./AnimatedAccordion.styles";

const AnimatedAccordionTrigger: FC<AnimatedAccordionTriggerProps> = (props) => {
  const { className, children, ...rest } = props;
  return (
    <Primitive.Header className={animatedAccordionSlots().header()}>
      <Primitive.Trigger
        data-slot="accordion-trigger"
        className={primitiveClassName(animatedAccordionSlots().trigger(), className)}
        {...rest}
      >
        {children}
        <span aria-hidden="true" className={animatedAccordionSlots().indicator()} />
      </Primitive.Trigger>
    </Primitive.Header>
  );
};

export default AnimatedAccordionTrigger;
