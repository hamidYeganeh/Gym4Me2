import { expect, userEvent, waitFor, within } from "storybook/test";

import type { Meta, StoryObj } from "@storybook/react";

import { colorControl, radiusControl, sizeControl } from "../../lib/story-controls";
import { Toggle } from "./index";

const meta = {
  title: "Kit/Toggle",
  component: Toggle,
  args: { "aria-label": "Bold", children: "B", size: "md", color: "primary" },
  argTypes: { color: colorControl, size: sizeControl, radius: radiusControl },
} satisfies Meta<typeof Toggle>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Pressed: Story = { args: { defaultPressed: true } };
export const Disabled: Story = { args: { disabled: true } };
export const Outlined: Story = { args: { variant: "outlined" } };
export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    const control = within(canvasElement).getByRole("button", { name: "Bold" });
    control.focus();
    await userEvent.keyboard(" ");
    await waitFor(() => expect(control).toHaveAttribute("aria-pressed", "true"));
    await userEvent.keyboard(" ");
    await waitFor(() => expect(control).toHaveAttribute("aria-pressed", "false"));
  },
};
