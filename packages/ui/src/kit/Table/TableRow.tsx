import type { TableRowProps } from "./Table.types";
import type { FC } from "react";

import { tableSlots } from "./Table.styles";

const TableRow: FC<TableRowProps> = (props) => {
  const { className, ...rest } = props;
  return <tr data-slot="table-row" className={tableSlots().row({ className })} {...rest} />;
};

export default TableRow;
