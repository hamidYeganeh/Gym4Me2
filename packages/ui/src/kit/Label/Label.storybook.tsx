import type { Meta, StoryObj } from "@storybook/react";

import Input from "../Input/Input";
import Label from "./Label";

const meta = {
  title: "Kit/Label",
  component: Label,
  args: { children: "Email", htmlFor: "email-example" },
} satisfies Meta<typeof Label>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Error: Story = { args: { color: "error" } };
export const WithInput: Story = {
  render: (args) => (
    <div className="flex max-w-sm flex-col gap-theme-2">
      <Label {...args} />
      <Input id="email-example" type="email" placeholder="you@example.com" />
    </div>
  ),
};
export const Persian: Story = { args: { children: "ایمیل" } };
