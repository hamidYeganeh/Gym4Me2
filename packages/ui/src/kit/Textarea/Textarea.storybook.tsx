import type { Meta, StoryObj } from "@storybook/react";

import { colorControl, radiusControl, shadowControl, sizeControl } from "../../lib/story-controls";
import Textarea from "./Textarea";

const meta = {
  title: "Kit/Textarea",
  component: Textarea,
  args: {
    "aria-label": "Message",
    placeholder: "Write a message",
    size: "md",
    radius: "md",
    variant: "outlined",
    color: "primary",
    resize: "vertical",
  },
  argTypes: {
    shadow: shadowControl,
    variant: { control: "select", options: ["outlined", "filled"] },
    color: colorControl,
    size: sizeControl,
    radius: radiusControl,
    resize: { control: "select", options: ["none", "vertical", "horizontal", "both"] },
  },
} satisfies Meta<typeof Textarea>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Filled: Story = { args: { variant: "filled" } };
export const Disabled: Story = { args: { disabled: true } };
export const Invalid: Story = { args: { color: "error", "aria-invalid": true } };
export const Persian: Story = {
  args: { lang: "fa", dir: "rtl", placeholder: "پیام خود را بنویسید" },
};
