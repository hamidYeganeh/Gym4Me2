import type { ItemDescriptionProps } from "./Item.types";
import type { FC } from "react";

import { itemSlots } from "./Item.styles";

const ItemDescription: FC<ItemDescriptionProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <p data-slot="item-description" className={itemSlots().description({ className })} {...rest} />
  );
};
export default ItemDescription;
