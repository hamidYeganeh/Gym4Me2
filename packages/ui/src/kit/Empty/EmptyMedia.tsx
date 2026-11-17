import type { EmptyMediaProps } from "./Empty.types";
import type { FC } from "react";

import { emptySlots } from "./Empty.styles";

const EmptyMedia: FC<EmptyMediaProps> = (props) => {
  const { className, variant, ...rest } = props;
  return (
    <div
      data-slot="empty-media"
      className={emptySlots({ variant }).media({ className })}
      {...rest}
    />
  );
};
export default EmptyMedia;
