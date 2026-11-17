import type { Meta, StoryObj } from "@storybook/react";

import { colorControl, radiusControl, shadowControl, sizeControl } from "../../lib/story-controls";
import Input from "./Input";

const meta = {
  title: "Kit/Input",
  component: Input,
  argTypes: {
    shadow: shadowControl,
    radius: radiusControl,
    size: sizeControl,
    color: colorControl,
    variant: { control: "select", options: ["outlined", "filled"] },
  },
  args: { "aria-label": "Example field", placeholder: "Enter a value" },
} satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Filled: Story = { args: { variant: "filled" } };
export const Small: Story = { args: { size: "sm" } };
export const Disabled: Story = { args: { disabled: true } };
export const Invalid: Story = {
  args: { color: "error", "aria-invalid": true },
};
export const Persian: Story = {
  args: { lang: "fa", dir: "rtl", placeholder: "مقدار را وارد کنید" },
};

export const CustomRadius: Story = { args: { radius: "full" } };
export const CustomClasses: Story = {
  args: { className: "rounded-theme-none text-theme-body-large" },
};
