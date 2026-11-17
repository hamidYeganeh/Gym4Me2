import type { ItemHeaderProps } from "./Item.types";
import type { FC } from "react";

import { itemSlots } from "./Item.styles";

const ItemHeader: FC<ItemHeaderProps> = (props) => {
  const { className, ...rest } = props;
  return <div data-slot="item-header" className={itemSlots().header({ className })} {...rest} />;
};
export default ItemHeader;
