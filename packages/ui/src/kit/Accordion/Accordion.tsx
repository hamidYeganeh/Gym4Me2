"use client";
import { accordionStyles } from "./Accordion.styles";
import type {
  AccordionContentProps,
  AccordionItemProps,
  AccordionProps,
  AccordionTriggerProps,
} from "./Accordion.types";

import { cn } from "@repo/ui/lib/utils";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { Accordion as AccordionPrimitive } from "radix-ui";

function Accordion({ className, ...props }: AccordionProps) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn(accordionStyles.accordion(), className)}
      {...props}
    />
  );
}

function AccordionItem({ className, ...props }: AccordionItemProps) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn(accordionStyles.accordionItem(), className)}
      {...props}
    />
  );
}

function AccordionTrigger({
  className,
  children,
  ...props
}: AccordionTriggerProps) {
  return (
    <AccordionPrimitive.Header className={accordionStyles.accordionTrigger()}>
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(accordionStyles.accordionTrigger2(), className)}
        {...props}
      >
        {children}
        <ChevronDownIcon
          data-slot="accordion-trigger-icon"
          className={accordionStyles.accordionTrigger3()}
        />
        <ChevronUpIcon
          data-slot="accordion-trigger-icon"
          className={accordionStyles.accordionTrigger4()}
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({
  className,
  children,
  ...props
}: AccordionContentProps) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className={accordionStyles.accordionContent()}
      {...props}
    >
      <div className={cn(accordionStyles.accordionContent2(), className)}>
        {children}
      </div>
    </AccordionPrimitive.Content>
  );
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
