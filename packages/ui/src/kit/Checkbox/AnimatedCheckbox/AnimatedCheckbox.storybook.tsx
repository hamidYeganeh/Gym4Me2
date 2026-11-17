import { expect, userEvent, waitFor, within } from "storybook/test";

import type { Meta, StoryObj } from "@storybook/react";

import { colorControl, radiusControl, sizeControl } from "../../../lib/story-controls";
import { AnimatedCheckbox, AnimatedCheckboxIndicator } from "./index";

const meta = {
  title: "Animated/Checkbox",
  component: AnimatedCheckbox,
  args: { "aria-label": "Enable notifications", size: "md", color: "primary" },
  argTypes: {
    radius: radiusControl,
    size: sizeControl,
    color: colorControl,
  },
  render: (args) => (
    <AnimatedCheckbox {...args}>
      <AnimatedCheckboxIndicator>{args.indeterminate ? "−" : "✓"}</AnimatedCheckboxIndicator>
    </AnimatedCheckbox>
  ),
} satisfies Meta<typeof AnimatedCheckbox>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Checked: Story = { args: { defaultChecked: true } };
export const Disabled: Story = { args: { disabled: true } };
export const Indeterminate: Story = { args: { indeterminate: true } };
export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    const control = within(canvasElement).getByRole("checkbox");
    await expect(control).not.toBeChecked();
    control.focus();
    await userEvent.keyboard(" ");
    await waitFor(() => expect(control).toBeChecked());
    await userEvent.keyboard(" ");
    await waitFor(() => expect(control).not.toBeChecked());
  },
};
