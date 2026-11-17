import type { TableCellProps } from "./Table.types";
import type { FC } from "react";

import { tableSlots } from "./Table.styles";

const TableCell: FC<TableCellProps> = (props) => {
  const { className, ...rest } = props;
  return <td data-slot="table-cell" className={tableSlots().cell({ className })} {...rest} />;
};

export default TableCell;
