import type { InputGroupTextProps } from "./InputGroup.types";
import type { FC } from "react";

import { inputGroupSlots } from "./InputGroup.styles";

const InputGroupText: FC<InputGroupTextProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <span
      data-slot="input-group-text"
      className={inputGroupSlots().text({ className })}
      {...rest}
    />
  );
};
export default InputGroupText;
