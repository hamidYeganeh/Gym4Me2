import type { FieldDescriptionProps } from "./Field.types";
import type { FC } from "react";

import { fieldSlots } from "./Field.styles";

const FieldDescription: FC<FieldDescriptionProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <p data-slot="description" className={fieldSlots().description({ className })} {...rest} />
  );
};
export default FieldDescription;
