import type { Accordion as Primitive } from "@animate-ui/react/primitives/base-ui/accordion";
import type { ComponentPropsWithRef } from "react";

export type AnimatedAccordionProps<Value = unknown> = Primitive.Root.Props<Value>;
export type AnimatedAccordionItemProps = ComponentPropsWithRef<typeof Primitive.Item>;
export type AnimatedAccordionTriggerProps = ComponentPropsWithRef<typeof Primitive.Trigger>;
export type AnimatedAccordionContentProps = ComponentPropsWithRef<typeof Primitive.Panel>;
