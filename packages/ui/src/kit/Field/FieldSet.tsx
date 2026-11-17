import type { FieldSetProps } from "./Field.types";
import type { FC } from "react";

import { fieldSlots } from "./Field.styles";

const FieldSet: FC<FieldSetProps> = (props) => {
  const { className, ...rest } = props;
  return <fieldset data-slot="set" className={fieldSlots().set({ className })} {...rest} />;
};
export default FieldSet;
