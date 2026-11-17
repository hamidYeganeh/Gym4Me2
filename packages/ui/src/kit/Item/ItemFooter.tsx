import type { ItemFooterProps } from "./Item.types";
import type { FC } from "react";

import { itemSlots } from "./Item.styles";

const ItemFooter: FC<ItemFooterProps> = (props) => {
  const { className, ...rest } = props;
  return <div data-slot="item-footer" className={itemSlots().footer({ className })} {...rest} />;
};
export default ItemFooter;
