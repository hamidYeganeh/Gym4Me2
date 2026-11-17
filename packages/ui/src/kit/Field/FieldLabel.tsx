import type { FieldLabelProps } from "./Field.types";
import type { FC } from "react";

import { fieldSlots } from "./Field.styles";

const FieldLabel: FC<FieldLabelProps> = (props) => {
  const { className, ...rest } = props;
  return <label data-slot="label" className={fieldSlots().label({ className })} {...rest} />;
};
export default FieldLabel;
