import { expect, userEvent, waitFor, within } from "storybook/test";

import type { Meta, StoryObj } from "@storybook/react";

import { AnimatedToggleGroup, AnimatedToggleGroupItem } from "./index";

const meta = {
  title: "Animated/ToggleGroup",
  component: AnimatedToggleGroup,
  args: { defaultValue: ["bold"], "aria-label": "Text formatting" },
  render: (args) => (
    <AnimatedToggleGroup {...args}>
      <AnimatedToggleGroupItem value="bold" aria-label="Bold">
        B
      </AnimatedToggleGroupItem>
      <AnimatedToggleGroupItem value="italic" aria-label="Italic">
        I
      </AnimatedToggleGroupItem>
      <AnimatedToggleGroupItem value="underline" aria-label="Underline" disabled>
        U
      </AnimatedToggleGroupItem>
    </AnimatedToggleGroup>
  ),
} satisfies Meta<typeof AnimatedToggleGroup>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Multiple: Story = { args: { multiple: true } };
export const Disabled: Story = { args: { disabled: true } };
export const Vertical: Story = { args: { orientation: "vertical" } };
export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bold = canvas.getByRole("button", { name: "Bold" });
    const italic = canvas.getByRole("button", { name: "Italic" });
    bold.focus();
    await userEvent.keyboard("{ArrowRight} ");
    await expect(italic).toHaveFocus();
    await waitFor(() => expect(italic).toHaveAttribute("aria-pressed", "true"));
    await expect(bold).toHaveAttribute("aria-pressed", "false");
  },
};
