import type { EmptyHeaderProps } from "./Empty.types";
import type { FC } from "react";

import { emptySlots } from "./Empty.styles";

const EmptyHeader: FC<EmptyHeaderProps> = (props) => {
  const { className, ...rest } = props;
  return <div data-slot="empty-header" className={emptySlots().header({ className })} {...rest} />;
};
export default EmptyHeader;
