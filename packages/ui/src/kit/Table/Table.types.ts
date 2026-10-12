import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import type { tableVariants } from "./Table.styles";
export type TableProps = React.ComponentProps<"table">;

export type TableHeaderProps = React.ComponentProps<"thead">;

export type TableBodyProps = React.ComponentProps<"tbody">;

export type TableFooterProps = React.ComponentProps<"tfoot">;

export type TableRowProps = React.ComponentProps<"tr">;

export type TableHeadProps = React.ComponentProps<"th">;

export type TableCellProps = React.ComponentProps<"td">;

export type TableCaptionProps = React.ComponentProps<"caption">;

export type TableVariants = VariantProps<typeof tableVariants>;
