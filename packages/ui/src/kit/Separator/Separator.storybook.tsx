import type { Meta, StoryObj } from "@storybook/react";

import Separator from "./Separator";

const meta = {
  title: "Kit/Separator",
  component: Separator,
  args: { decorative: true, orientation: "horizontal" },
} satisfies Meta<typeof Separator>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Semantic: Story = { args: { decorative: false } };
export const Vertical: Story = {
  args: { orientation: "vertical" },
  render: (args) => (
    <div className="flex h-12 items-center gap-theme-4">
      <span>Start</span>
      <Separator {...args} />
      <span>End</span>
    </div>
  ),
};
