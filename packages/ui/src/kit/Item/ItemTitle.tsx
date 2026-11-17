import type { ItemTitleProps } from "./Item.types";
import type { FC } from "react";

import { itemSlots } from "./Item.styles";

const ItemTitle: FC<ItemTitleProps> = (props) => {
  const { className, ...rest } = props;
  return <div data-slot="item-title" className={itemSlots().title({ className })} {...rest} />;
};
export default ItemTitle;
