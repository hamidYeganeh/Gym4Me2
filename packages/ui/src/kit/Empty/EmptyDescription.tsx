import type { EmptyDescriptionProps } from "./Empty.types";
import type { FC } from "react";

import { emptySlots } from "./Empty.styles";

const EmptyDescription: FC<EmptyDescriptionProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <p
      data-slot="empty-description"
      className={emptySlots().description({ className })}
      {...rest}
    />
  );
};
export default EmptyDescription;
