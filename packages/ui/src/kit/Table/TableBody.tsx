import type { TableBodyProps } from "./Table.types";
import type { FC } from "react";

import { tableSlots } from "./Table.styles";

const TableBody: FC<TableBodyProps> = (props) => {
  const { className, ...rest } = props;
  return <tbody data-slot="table-body" className={tableSlots().body({ className })} {...rest} />;
};

export default TableBody;
