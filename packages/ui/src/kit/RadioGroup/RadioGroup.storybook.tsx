import { expect, userEvent, waitFor, within } from "storybook/test";

import type { Meta, StoryObj } from "@storybook/react";

import { RadioGroup, RadioGroupItem } from "./index";

const meta = {
  title: "Kit/RadioGroup",
  component: RadioGroup,
  args: { defaultValue: "email", name: "notification", "aria-label": "Notification method" },
  render: (args) => (
    <RadioGroup {...args}>
      <label className="flex items-center gap-theme-2">
        <RadioGroupItem value="email" />
        Email
      </label>
      <label className="flex items-center gap-theme-2">
        <RadioGroupItem value="sms" />
        SMS
      </label>
      <label className="flex items-center gap-theme-2">
        <RadioGroupItem value="push" disabled />
        Push notifications
      </label>
    </RadioGroup>
  ),
} satisfies Meta<typeof RadioGroup>;
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
