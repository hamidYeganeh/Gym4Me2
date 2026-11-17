import { expect, userEvent, waitFor, within } from "storybook/test";

import type { Meta, StoryObj } from "@storybook/react";

import { colorControl, radiusControl, shadowControl, sizeControl } from "../../lib/story-controls";
import {
  Select,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectList,
  SelectPopup,
  SelectPortal,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "./index";

const items = [
  { value: "apple", label: "Apple" },
  { value: "pear", label: "Pear" },
  { value: "orange", label: "Orange" },
];

const meta = {
  title: "Kit/Select",
  component: SelectTrigger,
  args: { size: "md", color: "primary", radius: "md", "aria-label": "Fruit" },
  argTypes: {
    shadow: shadowControl,
    radius: radiusControl,
    color: colorControl,
    size: sizeControl,
  },
  render: (args) => (
    <Select items={items} defaultValue="apple" name="fruit" disabled={args.disabled}>
      <SelectTrigger {...args}>
        <SelectValue />
      </SelectTrigger>
      <SelectPortal>
        <SelectPositioner sideOffset={8} alignItemWithTrigger={false}>
          <SelectPopup>
            <SelectList>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value} size={args.size}>
                  <SelectItemText>{item.label}</SelectItemText>
                  <SelectItemIndicator aria-hidden>✓</SelectItemIndicator>
                </SelectItem>
              ))}
            </SelectList>
          </SelectPopup>
        </SelectPositioner>
      </SelectPortal>
    </Select>
  ),
} satisfies Meta<typeof SelectTrigger>;
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
