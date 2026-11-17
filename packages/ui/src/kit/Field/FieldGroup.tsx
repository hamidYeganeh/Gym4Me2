import type { FieldGroupProps } from "./Field.types";
import type { FC } from "react";

import { fieldSlots } from "./Field.styles";

const FieldGroup: FC<FieldGroupProps> = (props) => {
  const { className, ...rest } = props;
  return <div data-slot="group" className={fieldSlots().group({ className })} {...rest} />;
};
export default FieldGroup;
