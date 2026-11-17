import type { TableHeaderProps } from "./Table.types";
import type { FC } from "react";

import { tableSlots } from "./Table.styles";

const TableHeader: FC<TableHeaderProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <thead data-slot="table-header" className={tableSlots().header({ className })} {...rest} />
  );
};

export default TableHeader;
