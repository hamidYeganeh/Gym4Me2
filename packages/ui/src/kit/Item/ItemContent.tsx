import type { ItemContentProps } from "./Item.types";
import type { FC } from "react";

import { itemSlots } from "./Item.styles";

const ItemContent: FC<ItemContentProps> = (props) => {
  const { className, ...rest } = props;
  return <div data-slot="item-content" className={itemSlots().content({ className })} {...rest} />;
};
export default ItemContent;
