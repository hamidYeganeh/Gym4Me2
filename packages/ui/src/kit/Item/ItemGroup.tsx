import type { ItemGroupProps } from "./Item.types";
import type { FC } from "react";

import { itemSlots } from "./Item.styles";

const ItemGroup: FC<ItemGroupProps> = (props) => {
  const { className, ...rest } = props;
  return <div data-slot="item-group" className={itemSlots().group({ className })} {...rest} />;
};
export default ItemGroup;
