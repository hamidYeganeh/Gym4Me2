import type { Accordion as Primitive } from "@base-ui/react/accordion";
import type { ComponentPropsWithRef } from "react";

export type AccordionProps<Value = unknown> = Primitive.Root.Props<Value>;
export type AccordionItemProps = ComponentPropsWithRef<typeof Primitive.Item>;
export type AccordionTriggerProps = ComponentPropsWithRef<typeof Primitive.Trigger>;
export type AccordionContentProps = ComponentPropsWithRef<typeof Primitive.Panel>;
