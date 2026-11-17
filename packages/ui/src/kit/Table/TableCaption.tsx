import type { TableCaptionProps } from "./Table.types";
import type { FC } from "react";

import { tableSlots } from "./Table.styles";

const TableCaption: FC<TableCaptionProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <caption data-slot="table-caption" className={tableSlots().caption({ className })} {...rest} />
  );
};

export default TableCaption;
