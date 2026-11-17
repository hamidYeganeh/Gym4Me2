import type { SheetFooterProps } from "./Sheet.types";
import type { FC } from "react";

import { sheetSlots } from "./Sheet.styles";

const SheetFooter: FC<SheetFooterProps> = (props) => {
  const { className, ...rest } = props;
  return <div data-slot="sheet-footer" className={sheetSlots().footer({ className })} {...rest} />;
};
export default SheetFooter;
