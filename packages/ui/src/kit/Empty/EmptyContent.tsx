import type { EmptyContentProps } from "./Empty.types";
import type { FC } from "react";

import { emptySlots } from "./Empty.styles";

const EmptyContent: FC<EmptyContentProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <div data-slot="empty-content" className={emptySlots().content({ className })} {...rest} />
  );
};
export default EmptyContent;
