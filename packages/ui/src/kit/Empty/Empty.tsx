import type { EmptyProps } from "./Empty.types";
import type { FC } from "react";

import { emptySlots } from "./Empty.styles";

const Empty: FC<EmptyProps> = (props) => {
  const { className, ...rest } = props;
  return <div data-slot="empty" className={emptySlots().root({ className })} {...rest} />;
};
export default Empty;
