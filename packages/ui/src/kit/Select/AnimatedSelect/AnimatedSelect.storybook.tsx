import { expect, userEvent, waitFor, within } from "storybook/test";

import type { Meta, StoryObj } from "@storybook/react";

import {
  colorControl,
  radiusControl,
  shadowControl,
  sizeControl,
} from "../../../lib/story-controls";
import {
  AnimatedSelect,
  AnimatedSelectItem,
  AnimatedSelectItemIndicator,
  AnimatedSelectItemText,
  AnimatedSelectList,
  AnimatedSelectPopup,
  AnimatedSelectPortal,
  AnimatedSelectPositioner,
  AnimatedSelectTrigger,
  AnimatedSelectValue,
} from "./index";

const items = [
  { value: "apple", label: "Apple" },
  { value: "pear", label: "Pear" },
  { value: "orange", label: "Orange" },
];

const meta = {
  title: "Animated/Select",
  component: AnimatedSelectTrigger,
  args: { size: "md", color: "primary", radius: "md", "aria-label": "Fruit" },
  argTypes: {
    shadow: shadowControl,
    radius: radiusControl,
    color: colorControl,
    size: sizeControl,
  },
  render: (args) => (
    <AnimatedSelect items={items} defaultValue="apple" name="fruit" disabled={args.disabled}>
      <AnimatedSelectTrigger {...args}>
        <AnimatedSelectValue />
      </AnimatedSelectTrigger>
      <AnimatedSelectPortal>
        <AnimatedSelectPositioner sideOffset={8} alignItemWithTrigger={false}>
          <AnimatedSelectPopup>
            <AnimatedSelectList>
              {items.map((item) => (
                <AnimatedSelectItem key={item.value} value={item.value} size={args.size}>
                  <AnimatedSelectItemText>{item.label}</AnimatedSelectItemText>
                  <AnimatedSelectItemIndicator aria-hidden>✓</AnimatedSelectItemIndicator>
                </AnimatedSelectItem>
              ))}
            </AnimatedSelectList>
          </AnimatedSelectPopup>
        </AnimatedSelectPositioner>
      </AnimatedSelectPortal>
    </AnimatedSelect>
  ),
} satisfies Meta<typeof AnimatedSelectTrigger>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole("combobox");
    await userEvent.click(trigger);
    await expect(await body.findByRole("listbox")).toBeVisible();
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await waitFor(() => expect(trigger).toHaveTextContent("Pear"));
    await waitFor(() => expect(trigger).toHaveFocus());
    await expect(canvasElement.querySelector('input[name="fruit"]')).toHaveValue("pear");
  },
};
