import { expect, userEvent, waitFor, within } from "storybook/test";

import type { Meta, StoryObj } from "@storybook/react";

import { AnimatedRadioGroup, AnimatedRadioGroupItem } from "./index";

const meta = {
  title: "Animated/RadioGroup",
  component: AnimatedRadioGroup,
  args: { defaultValue: "email", name: "notification", "aria-label": "Notification method" },
  render: (args) => (
    <AnimatedRadioGroup {...args}>
      <label className="flex items-center gap-theme-2">
        <AnimatedRadioGroupItem value="email" />
        Email
      </label>
      <label className="flex items-center gap-theme-2">
        <AnimatedRadioGroupItem value="sms" />
        SMS
      </label>
      <label className="flex items-center gap-theme-2">
        <AnimatedRadioGroupItem value="push" disabled />
        Push notifications
      </label>
    </AnimatedRadioGroup>
  ),
} satisfies Meta<typeof AnimatedRadioGroup>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
export const ReadOnly: Story = { args: { readOnly: true } };
export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const email = canvas.getByRole("radio", { name: "Email" });
    const sms = canvas.getByRole("radio", { name: "SMS" });
    email.focus();
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() => expect(sms).toHaveAttribute("aria-checked", "true"));
    await expect(email).toHaveAttribute("aria-checked", "false");
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() => expect(email).toHaveAttribute("aria-checked", "true"));
  },
};
