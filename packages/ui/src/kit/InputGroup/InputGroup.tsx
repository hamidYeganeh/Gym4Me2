import type { InputGroupProps } from "./InputGroup.types";
import type { FC } from "react";

import { inputGroupSlots } from "./InputGroup.styles";

const InputGroup: FC<InputGroupProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <div data-slot="input-group" className={inputGroupSlots().root({ className })} {...rest} />
  );
};
export default InputGroup;
