import type { SheetHeaderProps } from "./Sheet.types";
import type { FC } from "react";

import { sheetSlots } from "./Sheet.styles";

const SheetHeader: FC<SheetHeaderProps> = (props) => {
  const { className, ...rest } = props;
  return <div data-slot="sheet-header" className={sheetSlots().header({ className })} {...rest} />;
};
export default SheetHeader;
