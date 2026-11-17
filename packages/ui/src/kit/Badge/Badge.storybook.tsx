import type { Meta, StoryObj } from "@storybook/react";

import { colorControl, radiusControl, shadowControl, sizeControl } from "../../lib/story-controls";
import Badge from "./Badge";

const meta = {
  title: "Kit/Badge",
  component: Badge,
  args: {
    children: "Status",
    color: "primary",
    variant: "contained",
    radius: "full",
    size: "md",
  },
  argTypes: {
    shadow: shadowControl,
    color: colorControl,
    variant: { control: "select", options: ["contained", "outlined", "text"] },
    radius: radiusControl,
    size: sizeControl,
  },
} satisfies Meta<typeof Badge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Outlined: Story = { args: { variant: "outlined" } };
export const StatusColors: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-theme-3">
      {(["primary", "secondary", "error", "success", "warning", "info"] as const).map((color) => (
        <Badge {...args} key={color} color={color}>
          {color}
        </Badge>
      ))}
    </div>
  ),
};
export const AsChild: Story = {
  args: { asChild: true, children: <a href="#badge">View status</a> },
};
export const Persian: Story = { args: { children: "فعال", color: "success" } };
