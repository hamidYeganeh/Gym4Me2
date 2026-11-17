import { expect, userEvent, waitFor, within } from "storybook/test";

import type { Meta, StoryObj } from "@storybook/react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "./index";

const meta = {
  title: "Kit/Tabs",
  component: Tabs,
  args: { defaultValue: "account" },
  render: (args) => (
    <Tabs {...args}>
      <TabsList aria-label="Settings">
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="billing" disabled>
          Billing
        </TabsTrigger>
      </TabsList>
      <TabsContent value="account">Manage your profile and display name.</TabsContent>
      <TabsContent value="security">Update your password and sign-in settings.</TabsContent>
    </Tabs>
  ),
} satisfies Meta<typeof Tabs>;
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
