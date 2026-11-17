import type { Meta, StoryObj } from "@storybook/react";

import { Skeleton } from "./index";

const meta = {
  title: "Kit/Skeleton",
  component: Skeleton,
  args: { className: "h-theme-4 w-theme-40" },
} satisfies Meta<typeof Skeleton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Profile: Story = {
  render: () => (
    <div role="status" aria-label="Loading profile" className="flex items-center gap-theme-4">
      <Skeleton radius="full" className="size-theme-12" />
      <div className="grid gap-theme-2">
        <Skeleton className="h-theme-4 w-theme-40" />
        <Skeleton className="h-theme-3 w-theme-32" />
      </div>
    </div>
  ),
};
export const Card: Story = {
  render: () => (
    <div role="status" aria-label="Loading card" className="grid w-theme-64 gap-theme-3">
      <Skeleton className="h-theme-32 w-full" />
      <Skeleton className="h-theme-4 w-3/4" />
      <Skeleton className="h-theme-4 w-1/2" />
    </div>
  ),
};
