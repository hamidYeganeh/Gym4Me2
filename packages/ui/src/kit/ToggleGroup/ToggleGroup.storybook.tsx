import { expect, userEvent, waitFor, within } from "storybook/test";

import type { Meta, StoryObj } from "@storybook/react";

import { ToggleGroup, ToggleGroupItem } from "./index";

const meta = {
  title: "Kit/ToggleGroup",
  component: ToggleGroup,
  args: { defaultValue: ["bold"], "aria-label": "Text formatting" },
  render: (args) => (
    <ToggleGroup {...args}>
      <ToggleGroupItem value="bold" aria-label="Bold">
        B
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Italic">
        I
      </ToggleGroupItem>
      <ToggleGroupItem value="underline" aria-label="Underline" disabled>
        U
      </ToggleGroupItem>
    </ToggleGroup>
  ),
} satisfies Meta<typeof ToggleGroup>;
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
