"use client";

import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";

import type { DataTableProps } from "./DataTable.types";

import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "../Table";

const DataTable = <Data, Value>(props: DataTableProps<Data, Value>) => {
  const { columns, data, emptyMessage, showFooter = false, ...rest } = props;
  // The table instance stays inside this component and is read on every render.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({ columns, data, getCoreRowModel: getCoreRowModel() });
  const rows = table.getRowModel().rows;

  return (
    <Table {...rest}>
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => (
              <TableHead
                key={header.id}
                colSpan={header.colSpan}
                scope={header.colSpan > 1 ? "colgroup" : "col"}
              >
                {header.isPlaceholder ? null : (
                  flexRender(header.column.columnDef.header, header.getContext())
                )}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {rows.length ?
          rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        : <TableRow>
            <TableCell colSpan={table.getVisibleLeafColumns().length}>{emptyMessage}</TableCell>
          </TableRow>
        }
      </TableBody>
      {showFooter && (
        <TableFooter>
          {table.getFooterGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <TableCell key={header.id} colSpan={header.colSpan}>
                  {header.isPlaceholder ? null : (
                    flexRender(header.column.columnDef.footer, header.getContext())
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableFooter>
      )}
    </Table>
  );
};

export default DataTable;
