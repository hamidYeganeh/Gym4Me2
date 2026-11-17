import type { EmptyTitleProps } from "./Empty.types";
import type { FC } from "react";

import { emptySlots } from "./Empty.styles";

const EmptyTitle: FC<EmptyTitleProps> = (props) => {
  const { className, ...rest } = props;
  return <h3 data-slot="empty-title" className={emptySlots().title({ className })} {...rest} />;
};
export default EmptyTitle;
