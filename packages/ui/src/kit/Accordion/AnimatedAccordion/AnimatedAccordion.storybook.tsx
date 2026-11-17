import type { Meta, StoryObj } from "@storybook/react";

import {
  AnimatedAccordion,
  AnimatedAccordionContent,
  AnimatedAccordionItem,
  AnimatedAccordionTrigger,
} from "./index";

const meta = { title: "Animated/Accordion", component: AnimatedAccordion } satisfies Meta;
export default meta;

export const Default: StoryObj<typeof meta> = {
  render: () => (
    <AnimatedAccordion defaultValue={["first"]}>
      <AnimatedAccordionItem value="first">
        <AnimatedAccordionTrigger>How does it work?</AnimatedAccordionTrigger>
        <AnimatedAccordionContent>Open a question to read its answer.</AnimatedAccordionContent>
      </AnimatedAccordionItem>
      <AnimatedAccordionItem value="second">
        <AnimatedAccordionTrigger>Can I use a keyboard?</AnimatedAccordionTrigger>
        <AnimatedAccordionContent>
          Press Enter or Space to toggle an answer.
        </AnimatedAccordionContent>
      </AnimatedAccordionItem>
    </AnimatedAccordion>
  ),
};
