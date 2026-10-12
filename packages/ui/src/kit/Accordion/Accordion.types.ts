import type { VariantProps } from "class-variance-authority";
import { Accordion as AccordionPrimitive } from "radix-ui";
import type * as React from "react";
import type { accordionVariants } from "./Accordion.styles";
export type AccordionProps = React.ComponentProps<
  typeof AccordionPrimitive.Root
>;

export type AccordionItemProps = React.ComponentProps<
  typeof AccordionPrimitive.Item
>;

export type AccordionTriggerProps = React.ComponentProps<
  typeof AccordionPrimitive.Trigger
>;

export type AccordionContentProps = React.ComponentProps<
  typeof AccordionPrimitive.Content
>;

export type AccordionVariants = VariantProps<typeof accordionVariants>;
