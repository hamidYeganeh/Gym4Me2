import type { Meta, StoryObj } from "@storybook/react";

import Empty, { EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "./index";

const meta = {
  title: "Kit/Empty",
  component: Empty,
  render: (args) => (
    <Empty {...args}>
      <EmptyHeader>
        <EmptyTitle>No projects yet</EmptyTitle>
        <EmptyDescription>Create a project to get started.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <button type="button">Create project</button>
      </EmptyContent>
    </Empty>
  ),
} satisfies Meta<typeof Empty>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
