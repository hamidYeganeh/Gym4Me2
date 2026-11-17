import type { ItemMediaProps } from "./Item.types";
import type { FC } from "react";

import { itemSlots } from "./Item.styles";

const ItemMedia: FC<ItemMediaProps> = (props) => {
  const { className, variant, size, ...rest } = props;
  return (
    <div
      data-slot="item-media"
      className={itemSlots({ variant, size }).media({ className })}
      {...rest}
    />
  );
};
export default ItemMedia;
