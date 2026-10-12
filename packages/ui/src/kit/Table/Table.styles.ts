import { cva } from "class-variance-authority";
export const tableVariants = cva("");

export const tableStyles = {
  table: cva("relative w-full overflow-x-auto"),
  table2: cva("w-full caption-bottom text-sm"),
  tableHeader: cva("[&_tr]:border-b"),
  tableBody: cva("[&_tr:last-child]:border-0"),
  tableFooter: cva("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0"),
  tableRow: cva(
    "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
  ),
  tableHead: cva(
    "h-12 px-3 text-start align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pe-0",
  ),
  tableCell: cva(
    "p-3 align-middle whitespace-nowrap [&:has([role=checkbox])]:pe-0",
  ),
  tableCaption: cva("mt-4 text-sm text-muted-foreground"),
};
