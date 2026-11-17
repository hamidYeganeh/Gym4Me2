import { expect, userEvent, waitFor, within } from "storybook/test";

import type { Meta, StoryObj } from "@storybook/react";

import { AnimatedTabs, AnimatedTabsContent, AnimatedTabsList, AnimatedTabsTrigger } from "./index";

const meta = {
  title: "Animated/Tabs",
  component: AnimatedTabs,
  args: { defaultValue: "account" },
  render: (args) => (
    <AnimatedTabs {...args}>
      <AnimatedTabsList aria-label="Settings">
        <AnimatedTabsTrigger value="account">Account</AnimatedTabsTrigger>
        <AnimatedTabsTrigger value="security">Security</AnimatedTabsTrigger>
        <AnimatedTabsTrigger value="billing" disabled>
          Billing
        </AnimatedTabsTrigger>
      </AnimatedTabsList>
      <AnimatedTabsContent value="account">
        Manage your profile and display name.
      </AnimatedTabsContent>
      <AnimatedTabsContent value="security">
        Update your password and sign-in settings.
      </AnimatedTabsContent>
    </AnimatedTabs>
  ),
} satisfies Meta<typeof AnimatedTabs>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Vertical: Story = { args: { orientation: "vertical" } };
export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const first = canvas.getByRole("tab", { name: "Account" });
    const second = canvas.getByRole("tab", { name: "Security" });
    first.focus();
    await userEvent.keyboard("{ArrowRight}{Enter}");
    await waitFor(() => expect(second).toHaveAttribute("aria-selected", "true"));
    await expect(await canvas.findByRole("tabpanel", { name: "Security" })).toHaveTextContent(
      "Update your password",
    );
    await expect(canvas.getByRole("tab", { name: "Billing" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await userEvent.keyboard("{ArrowLeft}{Enter}");
    await waitFor(() => expect(first).toHaveAttribute("aria-selected", "true"));
  },
};
