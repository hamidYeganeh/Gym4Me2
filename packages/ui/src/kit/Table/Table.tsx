import type { TableProps } from "./Table.types";
import type { FC } from "react";

import { tableSlots } from "./Table.styles";

const Table: FC<TableProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <div data-slot="table-container" className={tableSlots().container()}>
      <table data-slot="table" className={tableSlots().root({ className })} {...rest} />
    </div>
  );
};

export default Table;
