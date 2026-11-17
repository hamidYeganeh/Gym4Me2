import type { ItemActionsProps } from "./Item.types";
import type { FC } from "react";

import { itemSlots } from "./Item.styles";

const ItemActions: FC<ItemActionsProps> = (props) => {
  const { className, ...rest } = props;
  return <div data-slot="item-actions" className={itemSlots().actions({ className })} {...rest} />;
};
export default ItemActions;
