import type { ItemSeparatorProps } from "./Item.types";
import type { FC } from "react";

import { itemSlots } from "./Item.styles";

const ItemSeparator: FC<ItemSeparatorProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <hr data-slot="item-separator" className={itemSlots().separator({ className })} {...rest} />
  );
};
export default ItemSeparator;
