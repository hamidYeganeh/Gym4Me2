import type { TableHeadProps } from "./Table.types";
import type { FC } from "react";

import { tableSlots } from "./Table.styles";

const TableHead: FC<TableHeadProps> = (props) => {
  const { className, ...rest } = props;
  return <th data-slot="table-head" className={tableSlots().head({ className })} {...rest} />;
};

export default TableHead;
