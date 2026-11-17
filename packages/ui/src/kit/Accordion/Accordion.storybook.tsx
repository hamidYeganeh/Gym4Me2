import type { Meta, StoryObj } from "@storybook/react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./index";

const meta = { title: "Kit/Accordion", component: Accordion } satisfies Meta;
export default meta;

export const Default: StoryObj<typeof meta> = {
  render: () => (
    <Accordion defaultValue={["first"]}>
      <AccordionItem value="first">
        <AccordionTrigger>How does it work?</AccordionTrigger>
        <AccordionContent>Open a question to read its answer.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="second">
        <AccordionTrigger>Can I use a keyboard?</AccordionTrigger>
        <AccordionContent>Press Enter or Space to toggle an answer.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};
