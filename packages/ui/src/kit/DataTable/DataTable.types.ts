import type { TableProps } from "../Table";
import type { ColumnDef } from "@tanstack/react-table";
import type { ReactNode } from "react";

export type DataTableProps<Data, Value = unknown> = Omit<TableProps, "children"> & {
  columns: ColumnDef<Data, Value>[];
  data: Data[];
  emptyMessage: ReactNode;
  showFooter?: boolean;
};
