import type { TableFooterProps } from "./Table.types";
import type { FC } from "react";

import { tableSlots } from "./Table.styles";

const TableFooter: FC<TableFooterProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <tfoot data-slot="table-footer" className={tableSlots().footer({ className })} {...rest} />
  );
};

export default TableFooter;
