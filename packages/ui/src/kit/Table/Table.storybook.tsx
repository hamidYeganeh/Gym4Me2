import type { Meta, StoryObj } from "@storybook/react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./index";

const meta = { title: "Kit/Table", component: Table } satisfies Meta;
export default meta;

export const Default: StoryObj<typeof meta> = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Model</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Short-term</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};
