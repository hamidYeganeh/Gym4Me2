import type { Meta, StoryObj } from "@storybook/react";

import { DataTable } from "./index";

const meta = { title: "Kit/DataTable", component: DataTable } satisfies Meta;
export default meta;

export const Default: StoryObj = {
  render: () => (
    <DataTable
      columns={[{ accessorKey: "model", header: "Model" }]}
      data={[{ model: "Short-term" }]}
      emptyMessage="No models"
    />
  ),
};
