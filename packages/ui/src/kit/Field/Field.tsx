import type { FieldProps } from "./Field.types";
import type { FC } from "react";

import { fieldSlots } from "./Field.styles";

const Field: FC<FieldProps> = (props) => {
  const { className, ...rest } = props;
  return <div data-slot="field" className={fieldSlots().field({ className })} {...rest} />;
};
export default Field;
